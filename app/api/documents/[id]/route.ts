import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Fetch document
    const document = await prisma.document.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        workspace: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            queries: true,
            comments: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        type: document.type,
        storageUrl: document.storageUrl,
        tags: document.tags,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        workspace: document.workspace.name,
        extractedText: document.extractedText,
        metadata: document.metadata,
        queriesCount: document._count.queries,
        commentsCount: document._count.comments,
      },
    })
  } catch (error) {
    console.error('Document fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch document',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Delete document
    await prisma.document.delete({
      where: {
        id,
        userId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    })
  } catch (error) {
    console.error('Document deletion error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete document',
      },
      { status: 500 }
    )
  }
}

