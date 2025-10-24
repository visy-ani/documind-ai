import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/prisma/client'
import { supabase } from '@/lib/supabase/client'
import { validateFile, getFileType } from '@/lib/validations/upload'
import { processDocument } from '@/lib/file-processing'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const workspaceId = formData.get('workspaceId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      )
    }

    // Server-side validation
    const validation = validateFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid file' },
        { status: 400 }
      )
    }

    // Additional size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Verify workspace access
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: user.id,
        workspaceId: workspaceId,
      },
    })

    if (!workspaceMember) {
      return NextResponse.json(
        { error: 'Access denied to this workspace' },
        { status: 403 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.substring(file.name.lastIndexOf('.'))
    const uniqueFilename = `${timestamp}-${randomString}${fileExtension}`
    const blobPath = `documents/${workspaceId}/${uniqueFilename}`

    // Upload to Vercel Blob
    const blob = await put(blobPath, file, {
      access: 'public',
      addRandomSuffix: false,
    })

    // Get file type
    const fileType = getFileType(file)

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        name: file.name,
        type: fileType,
        storageUrl: blob.url,
        workspaceId: workspaceId,
        userId: user.id,
        tags: [],
        metadata: {
          size: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
        },
      },
    })

    // Start background processing (async, don't wait)
    processDocumentInBackground(document.id, blob.url, fileType).catch((error) => {
      console.error('Background processing error:', error)
    })

    // Return success response immediately
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        type: document.type,
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        size: file.size,
        createdAt: document.createdAt,
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to upload file',
        details: process.env.NODE_ENV === 'development' ? error : undefined 
      },
      { status: 500 }
    )
  }
}

// Background processing function
async function processDocumentInBackground(
  documentId: string,
  storageUrl: string,
  fileType: string
) {
  try {
    // Fetch file from storage
    const response = await fetch(storageUrl)
    if (!response.ok) {
      throw new Error('Failed to fetch document from storage')
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Process document
    const { text, metadata } = await processDocument(buffer, fileType)

    // Update document with extracted text
    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractedText: text,
        metadata: {
          processedAt: new Date().toISOString(),
          ...metadata,
        },
      },
    })

    console.log(`Document ${documentId} processed successfully`)
  } catch (error) {
    console.error(`Failed to process document ${documentId}:`, error)
    // Don't throw - we don't want to crash the upload response
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}

