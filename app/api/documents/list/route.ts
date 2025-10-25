import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: { userId: string; workspaceId?: string } = { userId: user.id }
    if (workspaceId) {
      where.workspaceId = workspaceId
    }

    // Fetch documents
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          workspace: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              comments: true,
              queries: true,
            },
          },
        },
      }),
      prisma.document.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      documents: documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        storageUrl: doc.storageUrl,
        tags: doc.tags,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        workspace: doc.workspace.name,
        commentsCount: doc._count.comments,
        queriesCount: doc._count.queries,
        metadata: doc.metadata,
      })),
      total,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error('Documents list error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch documents',
      },
      { status: 500 }
    )
  }
}

