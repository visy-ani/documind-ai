'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { prisma } from '@/lib/prisma/client'
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  type LoginInput,
  type SignupInput,
  type ForgotPasswordInput,
} from '@/lib/validations/auth'

type ActionResponse<T = void> = {
  success: boolean
  error?: string
  data?: T
}

/**
 * Login with email and password
 */
export async function loginAction(
  data: LoginInput
): Promise<ActionResponse<{ redirectUrl: string }>> {
  try {
    // Validate input
    const validatedData = loginSchema.parse(data)

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    })

    if (authError) {
      return {
        success: false,
        error: authError.message || 'Invalid email or password',
      }
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Authentication failed',
      }
    }

    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    // If user doesn't exist in our database, create them
    if (!user) {
      await prisma.user.create({
        data: {
          id: authData.user.id,
          email: validatedData.email,
          name: authData.user.user_metadata?.name || null,
          provider: 'email',
          usageTier: 'free',
        },
      })
    }

    revalidatePath('/', 'layout')
    
    return {
      success: true,
      data: { redirectUrl: '/dashboard' },
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Sign up with email and password
 */
export async function signupAction(
  data: SignupInput
): Promise<ActionResponse<{ redirectUrl: string }>> {
  try {
    // Validate input
    const validatedData = signupSchema.parse(data)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return {
        success: false,
        error: 'An account with this email already exists',
      }
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          name: validatedData.name,
        },
      },
    })

    if (authError) {
      return {
        success: false,
        error: authError.message || 'Failed to create account',
      }
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Failed to create account',
      }
    }

    // Create user in our database
    await prisma.user.create({
      data: {
        id: authData.user.id,
        email: validatedData.email,
        name: validatedData.name,
        provider: 'email',
        usageTier: 'free',
      },
    })

    // Create default workspace for the user
    const workspace = await prisma.workspace.create({
      data: {
        name: `${validatedData.name}'s Workspace`,
        ownerId: authData.user.id,
      },
    })

    // Add user as admin member of their workspace
    await prisma.workspaceMember.create({
      data: {
        userId: authData.user.id,
        workspaceId: workspace.id,
        role: 'admin',
      },
    })

    revalidatePath('/', 'layout')
    
    return {
      success: true,
      data: { redirectUrl: '/dashboard' },
    }
  } catch (error) {
    console.error('Signup error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Sign in with OAuth (Google)
 */
export async function signInWithGoogleAction(): Promise<ActionResponse<{ url: string }>> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to sign in with Google',
      }
    }

    if (!data.url) {
      return {
        success: false,
        error: 'Failed to get authorization URL',
      }
    }

    return {
      success: true,
      data: { url: data.url },
    }
  } catch (error) {
    console.error('Google OAuth error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Sign out
 */
export async function signOutAction(): Promise<ActionResponse> {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to sign out',
      }
    }

    revalidatePath('/', 'layout')
    redirect('/login')
  } catch (error) {
    console.error('Sign out error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Send password reset email
 */
export async function forgotPasswordAction(
  data: ForgotPasswordInput
): Promise<ActionResponse> {
  try {
    // Validate input
    const validatedData = forgotPasswordSchema.parse(data)

    // Send reset email via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(validatedData.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to send reset email',
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Forgot password error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Get current user session
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Get user from database with additional info
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        workspaces: {
          include: {
            workspace: true,
          },
        },
      },
    })

    return dbUser
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

