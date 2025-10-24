import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { prisma } from '@/lib/prisma/client'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    try {
      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('OAuth callback error:', error)
        return NextResponse.redirect(
          new URL('/login?error=oauth_failed', requestUrl.origin)
        )
      }

      if (data.user) {
        // Check if user exists in database
        const existingUser = await prisma.user.findUnique({
          where: { id: data.user.id },
        })

        // Create user if doesn't exist
        if (!existingUser) {
          const user = await prisma.user.create({
            data: {
              id: data.user.id,
              email: data.user.email!,
              name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
              provider: 'google',
              avatarUrl: data.user.user_metadata?.avatar_url || null,
              usageTier: 'free',
            },
          })

          // Create default workspace
          const workspace = await prisma.workspace.create({
            data: {
              name: `${user.name || 'My'}'s Workspace`,
              ownerId: user.id,
            },
          })

          // Add user as admin member
          await prisma.workspaceMember.create({
            data: {
              userId: user.id,
              workspaceId: workspace.id,
              role: 'admin',
            },
          })
        }
      }

      // Redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
    } catch (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(
        new URL('/login?error=oauth_failed', requestUrl.origin)
      )
    }
  }

  // No code provided
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}

