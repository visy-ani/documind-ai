import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { createClient } from '@/lib/supabase/server'
import { extractEntities } from '@/lib/ai/document-analyzer'

/**
 * POST /api/ai/extract
 * 
 * Extract entities from a document
 * 
 * Request Body:
 * {
 *   documentId: string
 * }
 * 
 * Response: JSON with extracted entities
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
    const { documentId } = body

    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json(
        { error: 'Document ID is required and must be a string' },
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
    // 5. EXTRACT ENTITIES
    // ============================================================
    const startTime = Date.now()
    
    const entities = await extractEntities(document.extractedText)
    
    const processingTime = Date.now() - startTime

    // Group entities by type for better organization
    const entitiesByType = entities.reduce((acc, entity) => {
      if (!acc[entity.type]) {
        acc[entity.type] = []
      }
      acc[entity.type].push(entity)
      return acc
    }, {} as Record<string, typeof entities>)

    // Sort each group by confidence
    Object.keys(entitiesByType).forEach(type => {
      entitiesByType[type].sort((a, b) => b.confidence - a.confidence)
    })

    // ============================================================
    // 6. SAVE TO DATABASE
    // ============================================================
    const savedQuery = await prisma.aIQuery.create({
      data: {
        documentId,
        userId: user.id,
        query: 'Extract entities from document',
        response: JSON.stringify({
          entities,
          entitiesByType,
          stats: {
            total: entities.length,
            byType: Object.entries(entitiesByType).map(([type, items]) => ({
              type,
              count: items.length,
            })),
          },
        }),
        model: 'gemini-2.0-flash-exp',
      },
    })

    // ============================================================
    // 7. RETURN ENTITIES
    // ============================================================
    return NextResponse.json({
      success: true,
      queryId: savedQuery.id,
      entities,
      entitiesByType,
      stats: {
        total: entities.length,
        byType: Object.entries(entitiesByType).map(([type, items]) => ({
          type,
          count: items.length,
        })),
        processingTime,
        model: 'gemini-2.0-flash-exp',
        timestamp: new Date().toISOString(),
      },
    })

  } catch (error) {
    console.error('Entity extraction error:', error)

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
        error: error instanceof Error ? error.message : 'Failed to extract entities',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.stack : String(error))
          : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/extract?documentId=xxx
 * 
 * Get cached entity extraction for a document
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

    // Find latest entity extraction query
    const latestExtraction = await prisma.aIQuery.findFirst({
      where: {
        documentId,
        userId: user.id,
        query: 'Extract entities from document',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!latestExtraction) {
      return NextResponse.json(
        { 
          success: true,
          hasEntities: false,
          message: 'No entity extraction found for this document'
        },
        { status: 200 }
      )
    }

    // Parse extraction response
    let extractionData
    try {
      extractionData = JSON.parse(latestExtraction.response)
    } catch {
      // If parsing fails, return empty
      extractionData = { entities: [], entitiesByType: {}, stats: { total: 0 } }
    }

    return NextResponse.json({
      success: true,
      hasEntities: true,
      queryId: latestExtraction.id,
      entities: extractionData.entities || [],
      entitiesByType: extractionData.entitiesByType || {},
      stats: extractionData.stats || { total: 0 },
      createdAt: latestExtraction.createdAt,
    })

  } catch (error) {
    console.error('Get entities error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch entities' },
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

