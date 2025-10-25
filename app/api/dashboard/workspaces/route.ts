import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
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

    // Fetch user's workspaces
    const workspaces = await prisma.workspace.findMany({
      where: {
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
        _count: {
          select: {
            members: true,
            documents: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Find user's current/active workspace (most recently updated)
    const activeWorkspaceId = workspaces[0]?.id

    // Format workspaces
    const formattedWorkspaces = workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      memberCount: workspace._count.members,
      documentCount: workspace._count.documents,
      members: workspace.members.slice(0, 4).map((member) => ({
        id: member.user.id,
        name: member.user.name || member.user.email,
        avatarUrl: member.user.avatarUrl || undefined,
      })),
      isActive: workspace.id === activeWorkspaceId,
      role: workspace.members.find((m) => m.userId === user.id)?.role || 'viewer',
    }))

    return NextResponse.json({
      success: true,
      workspaces: formattedWorkspaces,
    })
  } catch (error) {
    console.error('Workspaces fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch workspaces',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Workspace name is required' },
        { status: 400 }
      )
    }

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'admin',
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
      },
    })

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        memberCount: workspace.members.length,
        members: workspace.members.map((member) => ({
          id: member.user.id,
          name: member.user.name || member.user.email,
          avatarUrl: member.user.avatarUrl || undefined,
        })),
        isActive: true,
        role: 'admin',
      },
    })
  } catch (error) {
    console.error('Workspace creation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create workspace',
      },
      { status: 500 }
    )
  }
}

