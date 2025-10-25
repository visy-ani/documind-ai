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

    // Get limit from query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Fetch recent AI queries
    const queries = await prisma.aIQuery.findMany({
      where: {
        document: {
          userId: user.id,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        document: {
          select: {
            name: true,
          },
        },
      },
    })

    // Fetch recent document uploads
    const uploads = await prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
      },
    })

    // Get user info
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        avatarUrl: true,
      },
    })

    // Combine and sort activities
    const activities = [
      ...queries.map((query) => ({
        id: query.id,
        type: 'query' as const,
        documentName: query.document.name,
        query: query.query.substring(0, 100) + (query.query.length > 100 ? '...' : ''),
        userName: dbUser?.name || user.email || 'You',
        userAvatar: dbUser?.avatarUrl || undefined,
        timestamp: query.createdAt,
      })),
      ...uploads.map((upload) => ({
        id: upload.id,
        type: 'upload' as const,
        documentName: upload.name,
        userName: upload.user.name || user.email || 'You',
        userAvatar: upload.user.avatarUrl || undefined,
        timestamp: upload.createdAt,
      })),
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      activities,
    })
  } catch (error) {
    console.error('Activities fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch activities',
      },
      { status: 500 }
    )
  }
}

