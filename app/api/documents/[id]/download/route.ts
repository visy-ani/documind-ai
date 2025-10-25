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

    // Fetch document and verify access
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

    // Fetch the file from storage
    const response = await fetch(document.storageUrl)
    
    if (!response.ok) {
      throw new Error('Failed to fetch file from storage')
    }

    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()

    // Return file with appropriate headers
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': blob.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${document.name}"`,
        'Content-Length': String(arrayBuffer.byteLength),
      },
    })
  } catch (error) {
    console.error('Document download error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to download document' },
      { status: 500 }
    )
  }
}

