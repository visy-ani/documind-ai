import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { createClient } from '@/lib/supabase/server'
import { compareDocuments } from '@/lib/ai/document-analyzer'

/**
 * POST /api/ai/compare
 * 
 * Compare two documents using AI
 * 
 * Request Body:
 * {
 *   documentId1: string,
 *   documentId2: string
 * }
 * 
 * Response: JSON with comparison results
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
    const { documentId1, documentId2 } = body

    if (!documentId1 || typeof documentId1 !== 'string') {
      return NextResponse.json(
        { error: 'Document ID 1 is required and must be a string' },
        { status: 400 }
      )
    }

    if (!documentId2 || typeof documentId2 !== 'string') {
      return NextResponse.json(
        { error: 'Document ID 2 is required and must be a string' },
        { status: 400 }
      )
    }

    if (documentId1 === documentId2) {
      return NextResponse.json(
        { error: 'Cannot compare a document with itself' },
        { status: 400 }
      )
    }

    // ============================================================
    // 3. VERIFY ACCESS TO BOTH DOCUMENTS
    // ============================================================
    const [document1, document2] = await Promise.all([
      prisma.document.findUnique({
        where: { id: documentId1 },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId: user.id },
              },
            },
          },
        },
      }),
      prisma.document.findUnique({
        where: { id: documentId2 },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId: user.id },
              },
            },
          },
        },
      }),
    ])

    if (!document1) {
      return NextResponse.json(
        { error: 'Document 1 not found' },
        { status: 404 }
      )
    }

    if (!document2) {
      return NextResponse.json(
        { error: 'Document 2 not found' },
        { status: 404 }
      )
    }

    // Check access to document 1
    const hasAccess1 = 
      document1.userId === user.id || 
      document1.workspace.members.length > 0

    if (!hasAccess1) {
      return NextResponse.json(
        { error: 'Access denied to document 1' },
        { status: 403 }
      )
    }

    // Check access to document 2
    const hasAccess2 = 
      document2.userId === user.id || 
      document2.workspace.members.length > 0

    if (!hasAccess2) {
      return NextResponse.json(
        { error: 'Access denied to document 2' },
        { status: 403 }
      )
    }

    // ============================================================
    // 4. CHECK IF BOTH DOCUMENTS HAVE EXTRACTED TEXT
    // ============================================================
    if (!document1.extractedText || document1.extractedText.trim().length === 0) {
      return NextResponse.json(
        {
          error: `Document 1 (${document1.name}) text is not available yet. Please wait for processing to complete.`,
          code: 'TEXT_NOT_EXTRACTED',
        },
        { status: 400 }
      )
    }

    if (!document2.extractedText || document2.extractedText.trim().length === 0) {
      return NextResponse.json(
        {
          error: `Document 2 (${document2.name}) text is not available yet. Please wait for processing to complete.`,
          code: 'TEXT_NOT_EXTRACTED',
        },
        { status: 400 }
      )
    }

    // ============================================================
    // 5. COMPARE DOCUMENTS
    // ============================================================
    const startTime = Date.now()
    
    const comparison = await compareDocuments(
      document1.extractedText,
      document2.extractedText
    )
    
    const processingTime = Date.now() - startTime

    // ============================================================
    // 6. SAVE TO DATABASE (for both documents)
    // ============================================================
    const comparisonQuery = `Compare documents: "${document1.name}" vs "${document2.name}"`
    const comparisonResponse = JSON.stringify(comparison)

    // Save query for both documents for history
    await Promise.all([
      prisma.aIQuery.create({
        data: {
          documentId: documentId1,
          userId: user.id,
          query: comparisonQuery,
          response: comparisonResponse,
          model: 'gemini-2.0-flash-exp',
        },
      }),
      prisma.aIQuery.create({
        data: {
          documentId: documentId2,
          userId: user.id,
          query: comparisonQuery,
          response: comparisonResponse,
          model: 'gemini-2.0-flash-exp',
        },
      }),
    ])

    // ============================================================
    // 7. RETURN COMPARISON
    // ============================================================
    return NextResponse.json({
      success: true,
      comparison: {
        documents: {
          document1: {
            id: document1.id,
            name: document1.name,
            type: document1.type,
          },
          document2: {
            id: document2.id,
            name: document2.name,
            type: document2.type,
          },
        },
        similarities: comparison.similarities,
        differences: comparison.differences,
        conflicts: comparison.conflicts || [],
        overallSimilarity: comparison.overallSimilarity,
        analysis: comparison.analysis,
        metadata: {
          ...comparison.metadata,
          processingTime,
        },
      },
    })

  } catch (error) {
    console.error('Document comparison error:', error)

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
        error: error instanceof Error ? error.message : 'Failed to compare documents',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.stack : String(error))
          : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/compare?documentId1=xxx&documentId2=yyy
 * 
 * Get cached comparison between two documents
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
    const documentId1 = searchParams.get('documentId1')
    const documentId2 = searchParams.get('documentId2')

    if (!documentId1 || !documentId2) {
      return NextResponse.json(
        { error: 'Both document IDs are required' },
        { status: 400 }
      )
    }

    // Verify access to both documents
    const [document1, document2] = await Promise.all([
      prisma.document.findUnique({
        where: { id: documentId1 },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId: user.id },
              },
            },
          },
        },
      }),
      prisma.document.findUnique({
        where: { id: documentId2 },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId: user.id },
              },
            },
          },
        },
      }),
    ])

    if (!document1 || !document2) {
      return NextResponse.json(
        { error: 'One or both documents not found' },
        { status: 404 }
      )
    }

    const hasAccess1 = document1.userId === user.id || document1.workspace.members.length > 0
    const hasAccess2 = document2.userId === user.id || document2.workspace.members.length > 0

    if (!hasAccess1 || !hasAccess2) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Find latest comparison query
    const latestComparison = await prisma.aIQuery.findFirst({
      where: {
        AND: [
          { documentId: documentId1 },
          { userId: user.id },
          { query: { contains: 'Compare documents' } },
          { query: { contains: document2.name } },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!latestComparison) {
      return NextResponse.json(
        { 
          success: true,
          hasComparison: false,
          message: 'No comparison found for these documents'
        },
        { status: 200 }
      )
    }

    // Parse comparison response
    let comparisonData
    try {
      comparisonData = JSON.parse(latestComparison.response)
    } catch {
      return NextResponse.json(
        { 
          success: true,
          hasComparison: false,
          message: 'Failed to parse comparison data'
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      hasComparison: true,
      queryId: latestComparison.id,
      comparison: {
        documents: {
          document1: {
            id: document1.id,
            name: document1.name,
            type: document1.type,
          },
          document2: {
            id: document2.id,
            name: document2.name,
            type: document2.type,
          },
        },
        ...comparisonData,
      },
      createdAt: latestComparison.createdAt,
    })

  } catch (error) {
    console.error('Get comparison error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comparison' },
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

