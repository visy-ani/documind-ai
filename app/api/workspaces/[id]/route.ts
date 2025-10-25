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

    // Fetch workspace with members and documents
    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        documents: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            name: true,
            type: true,
            createdAt: true,
          },
        },
      },
    })

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        ownerId: workspace.ownerId,
        createdAt: workspace.createdAt,
        members: workspace.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          user: {
            name: m.user.name || m.user.email,
            email: m.user.email,
            avatarUrl: m.user.avatarUrl,
          },
        })),
        documents: workspace.documents,
      },
    })
  } catch (error) {
    console.error('Workspace fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workspace' },
      { status: 500 }
    )
  }
}

