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

    // Fetch user's documents count
    const documentsCount = await prisma.document.count({
      where: { userId: user.id },
    })

    // Fetch user's AI queries count
    const queriesCount = await prisma.aIQuery.count({
      where: {
        document: {
          userId: user.id,
        },
      },
    })

    // Fetch recent documents (last 5)
    const recentDocuments = await prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        metadata: true,
      },
    })

    // Calculate storage used (from metadata)
    const allDocuments = await prisma.document.findMany({
      where: { userId: user.id },
      select: { metadata: true },
    })

    const totalBytes = allDocuments.reduce((acc, doc) => {
      const metadata = doc.metadata as Record<string, unknown> | null
      const size = (metadata?.size as number) || 0
      return acc + size
    }, 0)

    const storage = formatBytes(totalBytes)

    // Count workspace members
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        members: true,
      },
    })

    // Get unique member count across all workspaces
    const memberIds = new Set<string>()
    workspaces.forEach((workspace) => {
      workspace.members.forEach((member) => {
        memberIds.add(member.userId)
      })
    })

    // Map documents with status
    const documents = recentDocuments.map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      createdAt: doc.createdAt,
      status: 'ready' as const, // Default to ready, can be enhanced with processing status
    }))

    return NextResponse.json({
      success: true,
      stats: {
        documents: documentsCount,
        queries: queriesCount,
        storage,
        members: memberIds.size,
      },
      documents,
      isEmpty: documentsCount === 0,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard stats',
      },
      { status: 500 }
    )
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
