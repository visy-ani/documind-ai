import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'

/**
 * POST /api/auth/signup-complete
 * 
 * Called after successful signup to create default workspace
 * and setup user profile in database
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
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

    // Check if user already has profile
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        workspaces: {
          include: {
            workspace: true,
          },
        },
      },
    })

    if (existingUser && existingUser.workspaces.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'User already setup',
        workspaceId: existingUser.workspaces[0].workspaceId,
      })
    }

    // Create user profile if doesn't exist
    let dbUser = existingUser
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          provider: user.app_metadata?.provider || 'email',
          avatarUrl: user.user_metadata?.avatar_url,
          usageTier: 'free',
        },
        include: {
          workspaces: {
            include: {
              workspace: true,
            },
          },
        },
      })
    }

    // Create default workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: `${dbUser.name}'s Workspace`,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'admin',
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Setup complete',
      workspaceId: workspace.id,
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
    })
  } catch (error) {
    console.error('Signup complete error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to complete setup',
      },
      { status: 500 }
    )
  }
}

