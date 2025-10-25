import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { createClient } from '@/lib/supabase/server'
import { analyzeDocumentStream } from '@/lib/ai/document-analyzer'
import { conversationManager } from '@/lib/ai/conversation-manager'
import { AIError, RateLimitError } from '@/types/ai'

// Rate limiting: 10 requests per minute per user
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 10

// In-memory rate limit tracking (consider using Redis for production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

/**
 * Check if user has exceeded rate limit
 */
function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    // Initialize or reset rate limit
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    })
    return { allowed: true }
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  // Increment count
  userLimit.count++
  return { allowed: true }
}

/**
 * POST /api/ai/query
 * 
 * Query a document with AI using streaming response
 * 
 * Request Body:
 * {
 *   documentId: string,
 *   query: string,
 *   conversationId?: string  // Optional for maintaining conversation context
 * }
 * 
 * Response: Server-Sent Events stream with AI response
 */
export async function POST(request: NextRequest) {
  let userId: string | undefined
  
  try {
    // ============================================================
    // 1. AUTHENTICATION
    // ============================================================
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to continue.' },
        { status: 401 }
      )
    }

    userId = user.id

    // ============================================================
    // 2. RATE LIMITING
    // ============================================================
    const rateLimitCheck = checkRateLimit(userId)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitCheck.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitCheck.retryAfter),
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(
              Math.floor((Date.now() + (rateLimitCheck.retryAfter || 0) * 1000) / 1000)
            ),
          },
        }
      )
    }

    // ============================================================
    // 3. VALIDATE REQUEST BODY
    // ============================================================
    const body = await request.json()
    const { documentId, query, conversationId } = body

    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json(
        { error: 'Document ID is required and must be a string' },
        { status: 400 }
      )
    }

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and cannot be empty' },
        { status: 400 }
      )
    }

    if (query.length > 10000) {
      return NextResponse.json(
        { error: 'Query is too long. Maximum length is 10,000 characters.' },
        { status: 400 }
      )
    }

    // ============================================================
    // 4. VERIFY DOCUMENT ACCESS
    // ============================================================
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId: userId },
            },
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check if user has access to the workspace
    const hasAccess = 
      document.userId === userId || 
      document.workspace.members.length > 0

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied. You do not have permission to access this document.' },
        { status: 403 }
      )
    }

    // ============================================================
    // 5. CHECK IF DOCUMENT HAS EXTRACTED TEXT
    // ============================================================
    if (!document.extractedText || document.extractedText.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Document text is not available yet. Please wait for processing to complete.',
          code: 'TEXT_NOT_EXTRACTED',
        },
        { status: 400 }
      )
    }

    // ============================================================
    // 6. GET CONVERSATION CONTEXT
    // ============================================================
    const context = await conversationManager.getContext(documentId, userId)
    const conversationHistory = await conversationManager.prepareHistory(
      context,
      document.extractedText
    )

    // ============================================================
    // 7. STREAM AI RESPONSE
    // ============================================================
    const encoder = new TextEncoder()
    let fullResponse = ''
    let queryId: string | undefined

    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
          )

          // Stream the AI response
          const startTime = Date.now()
          
          for await (const chunk of analyzeDocumentStream(
            document.extractedText!,
            query,
            {
              conversationHistory: conversationHistory.length > 0 
                ? conversationHistory 
                : undefined,
            }
          )) {
            fullResponse += chunk
            
            // Send chunk to client
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ 
                  type: 'chunk', 
                  content: chunk 
                })}\n\n`
              )
            )
          }

          const processingTime = Date.now() - startTime

          // ============================================================
          // 8. SAVE QUERY TO DATABASE
          // ============================================================
          const savedQuery = await prisma.aIQuery.create({
            data: {
              documentId,
              userId,
              query: query.trim(),
              response: fullResponse,
              model: 'gemini-2.0-flash-exp',
            },
          })

          queryId = savedQuery.id

          // Send completion event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'done',
                queryId: savedQuery.id,
                metadata: {
                  processingTime,
                  model: 'gemini-2.0-flash-exp',
                  timestamp: new Date().toISOString(),
                },
              })}\n\n`
            )
          )

          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          
          const errorMessage = error instanceof AIError 
            ? error.message 
            : 'An error occurred while processing your request'

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: errorMessage,
                code: error instanceof AIError ? error.code : 'UNKNOWN_ERROR',
              })}\n\n`
            )
          )

          controller.close()
        }
      },
    })

    return new NextResponse(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering in Nginx
      },
    })

  } catch (error) {
    console.error('AI Query API error:', error)

    // Handle specific error types
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        {
          error: error.message,
          retryAfter: error.retryAfter,
        },
        { status: 429 }
      )
    }

    if (error instanceof AIError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          retryable: error.retryable,
        },
        { status: 500 }
      )
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'An unexpected error occurred. Please try again.',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : String(error))
          : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/query?documentId=xxx
 * 
 * Get query history for a document
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get documentId from query params
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Verify document access
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId: user.id },
            },
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const hasAccess = 
      document.userId === user.id || 
      document.workspace.members.length > 0

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get conversation history
    const context = await conversationManager.getContext(documentId, user.id)

    return NextResponse.json({
      success: true,
      documentId,
      messages: context.messages,
      totalTokens: context.totalTokens,
      messageCount: context.messages.length,
      lastUpdated: context.lastUpdated,
    })

  } catch (error) {
    console.error('Get query history error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch query history' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ai/query?queryId=xxx
 * 
 * Delete a specific query from history
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const queryId = searchParams.get('queryId')

    if (!queryId) {
      return NextResponse.json(
        { error: 'Query ID is required' },
        { status: 400 }
      )
    }

    // Verify ownership and delete
    const query = await prisma.aIQuery.findUnique({
      where: { id: queryId },
    })

    if (!query) {
      return NextResponse.json(
        { error: 'Query not found' },
        { status: 404 }
      )
    }

    if (query.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    await prisma.aIQuery.delete({
      where: { id: queryId },
    })

    return NextResponse.json({
      success: true,
      message: 'Query deleted successfully',
    })

  } catch (error) {
    console.error('Delete query error:', error)
    return NextResponse.json(
      { error: 'Failed to delete query' },
      { status: 500 }
    )
  }
}

/**
 * Handle OPTIONS for CORS
 */
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}

