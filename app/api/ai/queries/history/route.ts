import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
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

    // Get all queries for user's documents
    const queries = await prisma.aIQuery.findMany({
      where: {
        document: {
          userId: user.id,
        },
      },
      include: {
        document: {
          select: {
            name: true,
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to last 100 queries
    })

    return NextResponse.json({
      success: true,
      queries: queries.map((q) => ({
        id: q.id,
        query: q.query,
        response: q.response,
        documentName: q.document.name,
        documentId: q.document.id,
        createdAt: q.createdAt,
        model: q.model,
      })),
    })
  } catch (error) {
    console.error('Queries history error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch queries' },
      { status: 500 }
    )
  }
}

