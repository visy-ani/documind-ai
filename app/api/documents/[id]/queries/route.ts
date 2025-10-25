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

    // Verify document belongs to user
    const document = await prisma.document.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Fetch queries
    const queries = await prisma.aIQuery.findMany({
      where: {
        documentId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      queries: queries.map((q) => ({
        id: q.id,
        query: q.query,
        response: q.response,
        createdAt: q.createdAt,
      })),
    })
  } catch (error) {
    console.error('Queries fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch queries',
      },
      { status: 500 }
    )
  }
}

