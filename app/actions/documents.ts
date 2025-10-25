'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma/client'
import { createClient } from '@/lib/supabase/server'
import { deleteFromBlob } from '@/lib/storage/blob'
import { processDocument } from '@/lib/file-processing'

type ActionResponse<T = void> = {
  success: boolean
  error?: string
  data?: T
}

/**
 * Process document content after upload
 * Extracts text and updates database
 */
export async function processDocumentContent(
  documentId: string
): Promise<ActionResponse<{ extractedText: string; metadata: Record<string, unknown> }>> {
  try {
    // Get current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

    // Get document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      return {
        success: false,
        error: 'Document not found',
      }
    }

    // Verify ownership
    if (document.userId !== user.id) {
      return {
        success: false,
        error: 'Access denied',
      }
    }

    // Fetch file from storage
    const response = await fetch(document.storageUrl)
    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to fetch document from storage',
      }
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Process document based on type
    const { text, metadata: processingMetadata } = await processDocument(
      buffer,
      document.type
    )

    // Update document with extracted text
    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractedText: text,
        metadata: {
          ...(document.metadata as Record<string, unknown>),
          ...processingMetadata,
          processedAt: new Date().toISOString(),
        },
      },
    })

    revalidatePath('/documents')
    revalidatePath(`/documents/${documentId}`)

    return {
      success: true,
      data: {
        extractedText: text,
        metadata: processingMetadata,
      },
    }
  } catch (error) {
    console.error('Process document error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process document',
    }
  }
}

/**
 * Delete document and cleanup storage
 */
export async function deleteDocument(
  documentId: string
): Promise<ActionResponse> {
  try {
    // Get current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

    // Get document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        queries: true,
        comments: true,
      },
    })

    if (!document) {
      return {
        success: false,
        error: 'Document not found',
      }
    }

    // Verify ownership or admin access
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: user.id,
        workspaceId: document.workspaceId,
        role: { in: ['admin', 'editor'] },
      },
    })

    if (!workspaceMember && document.userId !== user.id) {
      return {
        success: false,
        error: 'Access denied',
      }
    }

    // Delete from storage
    try {
      await deleteFromBlob(document.storageUrl)
    } catch (storageError) {
      console.error('Storage deletion error:', storageError)
      // Continue with database deletion even if storage fails
    }

    // Delete from database (cascades to queries and comments)
    await prisma.document.delete({
      where: { id: documentId },
    })

    revalidatePath('/documents')
    revalidatePath('/dashboard')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Delete document error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete document',
    }
  }
}

/**
 * Get document with extracted text
 */
export async function getDocument(documentId: string): Promise<ActionResponse<{
  id: string
  name: string
  type: string
  storageUrl: string
  extractedText: string | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}>> {
  try {
    // Get current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

    // Get document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      return {
        success: false,
        error: 'Document not found',
      }
    }

    // Verify access
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: user.id,
        workspaceId: document.workspaceId,
      },
    })

    if (!workspaceMember) {
      return {
        success: false,
        error: 'Access denied',
      }
    }

    return {
      success: true,
      data: {
        id: document.id,
        name: document.name,
        type: document.type,
        storageUrl: document.storageUrl,
        extractedText: document.extractedText,
        metadata: (document.metadata as Record<string, unknown>) || {},
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
    }
  } catch (error) {
    console.error('Get document error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get document',
    }
  }
}

/**
 * List all documents in a workspace
 */
export async function listDocuments(workspaceId: string): Promise<ActionResponse<Array<{
  id: string
  name: string
  type: string
  size: number
  hasExtractedText: boolean
  createdAt: Date
}>>> {
  try {
    // Get current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

    // Verify workspace access
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: user.id,
        workspaceId: workspaceId,
      },
    })

    if (!workspaceMember) {
      return {
        success: false,
        error: 'Access denied to this workspace',
      }
    }

    // Get documents
    const documents = await prisma.document.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        extractedText: true,
        metadata: true,
        createdAt: true,
      },
    })

    return {
      success: true,
      data: documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: (doc.metadata as Record<string, unknown>)?.size as number || 0,
        hasExtractedText: !!doc.extractedText,
        createdAt: doc.createdAt,
      })),
    }
  } catch (error) {
    console.error('List documents error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list documents',
    }
  }
}

/**
 * Update document metadata
 */
export async function updateDocument(
  documentId: string,
  data: {
    name?: string
    tags?: string[]
  }
): Promise<ActionResponse> {
  try {
    // Get current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

    // Get document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      return {
        success: false,
        error: 'Document not found',
      }
    }

    // Verify access
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: user.id,
        workspaceId: document.workspaceId,
        role: { in: ['admin', 'editor'] },
      },
    })

    if (!workspaceMember && document.userId !== user.id) {
      return {
        success: false,
        error: 'Access denied',
      }
    }

    // Update document
    await prisma.document.update({
      where: { id: documentId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.tags && { tags: data.tags }),
      },
    })

    revalidatePath('/documents')
    revalidatePath(`/documents/${documentId}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Update document error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update document',
    }
  }
}

