import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { createClient } from '@/lib/supabase/server'
import { generateSummary } from '@/lib/ai/document-analyzer'
import { SummaryOptions } from '@/types/ai'

/**
 * POST /api/ai/summary
 * 
 * Generate a summary of a document
 * 
 * Request Body:
 * {
 *   documentId: string,
 *   options: {
 *     format: 'brief' | 'detailed',
 *     style: 'bullet-points' | 'paragraph',
 *     includeKeyInsights?: boolean,
 *     includeActionItems?: boolean,
 *     maxLength?: number
 *   }
 * }
 * 
 * Response: JSON with summary data
 */
export async function POST(request: NextRequest) {
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

    // ============================================================
    // 2. VALIDATE REQUEST BODY
    // ============================================================
    const body = await request.json()
    const { documentId, options } = body

    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json(
        { error: 'Document ID is required and must be a string' },
        { status: 400 }
      )
    }

    // Validate options
    const summaryOptions: SummaryOptions = {
      format: options?.format || 'detailed',
      style: options?.style || 'paragraph',
      includeKeyInsights: options?.includeKeyInsights ?? true,
      includeActionItems: options?.includeActionItems ?? true,
      maxLength: options?.maxLength,
    }

    // Validate format and style
    if (!['brief', 'detailed'].includes(summaryOptions.format)) {
      return NextResponse.json(
        { error: 'Format must be "brief" or "detailed"' },
        { status: 400 }
      )
    }

    if (!['bullet-points', 'paragraph'].includes(summaryOptions.style)) {
      return NextResponse.json(
        { error: 'Style must be "bullet-points" or "paragraph"' },
        { status: 400 }
      )
    }

    // ============================================================
    // 3. VERIFY DOCUMENT ACCESS
    // ============================================================
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

    // Check if user has access
    const hasAccess = 
      document.userId === user.id || 
      document.workspace.members.length > 0

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied. You do not have permission to access this document.' },
        { status: 403 }
      )
    }

    // ============================================================
    // 4. CHECK IF DOCUMENT HAS EXTRACTED TEXT
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
    // 5. GENERATE SUMMARY
    // ============================================================
    const startTime = Date.now()
    
    const summary = await generateSummary(
      document.extractedText,
      summaryOptions
    )

    const processingTime = Date.now() - startTime

    // ============================================================
    // 6. SAVE TO DATABASE
    // ============================================================
    const savedQuery = await prisma.aIQuery.create({
      data: {
        documentId,
        userId: user.id,
        query: `Generate ${summaryOptions.format} summary in ${summaryOptions.style} format`,
        response: JSON.stringify(summary),
        model: 'gemini-2.0-flash-exp',
      },
    })

    // ============================================================
    // 7. RETURN SUMMARY
    // ============================================================
    return NextResponse.json({
      success: true,
      queryId: savedQuery.id,
      summary: {
        text: summary.text,
        keyInsights: summary.keyInsights,
        actionItems: summary.actionItems,
        metadata: {
          ...summary.metadata,
          processingTime,
          options: summaryOptions,
        },
      },
    })

  } catch (error) {
    console.error('Summary generation error:', error)

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
        error: error instanceof Error ? error.message : 'Failed to generate summary',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.stack : String(error))
          : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/summary?documentId=xxx
 * 
 * Get cached summary for a document (latest summary query)
 */
export async function GET(request: NextRequest) {
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

    // Find latest summary query
    const latestSummary = await prisma.aIQuery.findFirst({
      where: {
        documentId,
        userId: user.id,
        query: {
          contains: 'summary',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!latestSummary) {
      return NextResponse.json(
        { 
          success: true,
          hasSummary: false,
          message: 'No summary found for this document'
        },
        { status: 200 }
      )
    }

    // Parse summary response
    let summaryData
    try {
      summaryData = JSON.parse(latestSummary.response)
    } catch {
      // If not JSON, treat as plain text
      summaryData = { text: latestSummary.response }
    }

    return NextResponse.json({
      success: true,
      hasSummary: true,
      queryId: latestSummary.id,
      summary: summaryData,
      createdAt: latestSummary.createdAt,
    })

  } catch (error) {
    console.error('Get summary error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
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

