'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma/client'
import { supabase } from '@/lib/supabase/client'
import { generateSummary, extractEntities, compareDocuments } from '@/lib/ai/document-analyzer'
import { conversationManager } from '@/lib/ai/conversation-manager'
import { SummaryOptions } from '@/types/ai'

// Validation schemas
const documentIdSchema = z.string().uuid('Invalid document ID')
const querySchema = z.string().min(1, 'Query cannot be empty').max(10000, 'Query is too long')

const summaryOptionsSchema = z.object({
  format: z.enum(['brief', 'detailed']).default('detailed'),
  style: z.enum(['bullet-points', 'paragraph']).default('paragraph'),
  maxLength: z.number().optional(),
  includeKeyInsights: z.boolean().default(true),
  includeActionItems: z.boolean().default(true),
})

// Helper function to get authenticated user
async function getAuthenticatedUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Unauthorized. Please log in to continue.')
  }
  
  return user
}

// Helper function to verify document access
async function verifyDocumentAccess(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      workspace: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  })

  if (!document) {
    throw new Error('Document not found')
  }

  const hasAccess = 
    document.userId === userId || 
    document.workspace.members.length > 0

  if (!hasAccess) {
    throw new Error('Access denied. You do not have permission to access this document.')
  }

  if (!document.extractedText || document.extractedText.trim().length === 0) {
    throw new Error('Document text is not available yet. Please wait for processing to complete.')
  }

  return document
}

/**
 * Query document action
 * Note: This is primarily for non-streaming use cases
 * For streaming, use the /api/ai/query endpoint directly
 */
export async function queryDocumentAction(
  documentId: string,
  query: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _conversationId?: string
) {
  try {
    // Validate inputs
    const validatedDocId = documentIdSchema.parse(documentId)
    querySchema.parse(query)

    // Authenticate
    const user = await getAuthenticatedUser()

    // Verify access and get document
    await verifyDocumentAccess(validatedDocId, user.id)

    // Get conversation context
    const context = await conversationManager.getContext(validatedDocId, user.id)

    return {
      success: true,
      message: 'Query received. Use the /api/ai/query endpoint for streaming responses.',
      conversationId: context.documentId,
    }
  } catch (error) {
    console.error('Query document action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process query',
    }
  }
}

/**
 * Generate summary action
 */
export async function generateSummaryAction(
  documentId: string,
  options?: z.infer<typeof summaryOptionsSchema>
) {
  try {
    // Validate inputs
    const validatedDocId = documentIdSchema.parse(documentId)
    const validatedOptions = summaryOptionsSchema.parse(options || {})

    // Authenticate
    const user = await getAuthenticatedUser()

    // Verify access and get document
    const document = await verifyDocumentAccess(validatedDocId, user.id)

    // Generate summary
    const summary = await generateSummary(document.extractedText!, validatedOptions as SummaryOptions)

    // Save to database
    await prisma.aIQuery.create({
      data: {
        documentId: validatedDocId,
        userId: user.id,
        query: `Generate ${validatedOptions.format} summary in ${validatedOptions.style} format`,
        response: JSON.stringify(summary),
        model: 'gemini-2.0-flash-exp',
      },
    })

    // Revalidate paths
    revalidatePath(`/documents/${validatedDocId}`)

    return {
      success: true,
      summary,
    }
  } catch (error) {
    console.error('Generate summary action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate summary',
    }
  }
}

/**
 * Extract entities action
 */
export async function extractEntitiesAction(documentId: string) {
  try {
    // Validate inputs
    const validatedDocId = documentIdSchema.parse(documentId)

    // Authenticate
    const user = await getAuthenticatedUser()

    // Verify access and get document
    const document = await verifyDocumentAccess(validatedDocId, user.id)

    // Extract entities
    const entities = await extractEntities(document.extractedText!)

    // Group entities by type
    const entitiesByType = entities.reduce((acc, entity) => {
      if (!acc[entity.type]) {
        acc[entity.type] = []
      }
      acc[entity.type].push(entity)
      return acc
    }, {} as Record<string, typeof entities>)

    // Sort each group by confidence
    Object.keys(entitiesByType).forEach(type => {
      entitiesByType[type].sort((a, b) => b.confidence - a.confidence)
    })

    // Save to database
    await prisma.aIQuery.create({
      data: {
        documentId: validatedDocId,
        userId: user.id,
        query: 'Extract entities from document',
        response: JSON.stringify({
          entities,
          entitiesByType,
          stats: {
            total: entities.length,
            byType: Object.entries(entitiesByType).map(([type, items]) => ({
              type,
              count: items.length,
            })),
          },
        }),
        model: 'gemini-2.0-flash-exp',
      },
    })

    // Revalidate paths
    revalidatePath(`/documents/${validatedDocId}`)

    return {
      success: true,
      entities,
      entitiesByType,
      stats: {
        total: entities.length,
        byType: Object.entries(entitiesByType).map(([type, items]) => ({
          type,
          count: items.length,
        })),
      },
    }
  } catch (error) {
    console.error('Extract entities action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract entities',
    }
  }
}

/**
 * Get conversation history action
 */
export async function getConversationHistoryAction(documentId: string) {
  try {
    // Validate inputs
    const validatedDocId = documentIdSchema.parse(documentId)

    // Authenticate
    const user = await getAuthenticatedUser()

    // Verify access
    await verifyDocumentAccess(validatedDocId, user.id)

    // Get conversation context
    const context = await conversationManager.getContext(validatedDocId, user.id)

    return {
      success: true,
      messages: context.messages,
      totalTokens: context.totalTokens,
      lastUpdated: context.lastUpdated,
    }
  } catch (error) {
    console.error('Get conversation history action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get conversation history',
    }
  }
}

/**
 * Delete query action
 */
export async function deleteQueryAction(queryId: string) {
  try {
    // Validate input
    const validatedQueryId = z.string().uuid().parse(queryId)

    // Authenticate
    const user = await getAuthenticatedUser()

    // Find query
    const query = await prisma.aIQuery.findUnique({
      where: { id: validatedQueryId },
    })

    if (!query) {
      throw new Error('Query not found')
    }

    // Verify ownership
    if (query.userId !== user.id) {
      throw new Error('Access denied. You can only delete your own queries.')
    }

    // Delete query
    await prisma.aIQuery.delete({
      where: { id: validatedQueryId },
    })

    // Revalidate paths
    revalidatePath(`/documents/${query.documentId}`)

    return {
      success: true,
      message: 'Query deleted successfully',
    }
  } catch (error) {
    console.error('Delete query action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete query',
    }
  }
}

/**
 * Clear conversation action
 */
export async function clearConversationAction(documentId: string) {
  try {
    // Validate input
    const validatedDocId = documentIdSchema.parse(documentId)

    // Authenticate
    const user = await getAuthenticatedUser()

    // Verify access
    await verifyDocumentAccess(validatedDocId, user.id)

    // Clear conversation
    await conversationManager.clearContext(validatedDocId, user.id)

    // Revalidate paths
    revalidatePath(`/documents/${validatedDocId}`)

    return {
      success: true,
      message: 'Conversation cleared successfully',
    }
  } catch (error) {
    console.error('Clear conversation action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear conversation',
    }
  }
}

/**
 * Export conversation action
 */
export async function exportConversationAction(
  documentId: string,
  format: 'json' | 'markdown' = 'markdown'
) {
  try {
    // Validate inputs
    const validatedDocId = documentIdSchema.parse(documentId)
    const validatedFormat = z.enum(['json', 'markdown']).parse(format)

    // Authenticate
    const user = await getAuthenticatedUser()

    // Verify access
    await verifyDocumentAccess(validatedDocId, user.id)

    // Export conversation
    const exported = await conversationManager.exportConversation(
      validatedDocId,
      user.id,
      validatedFormat
    )

    return {
      success: true,
      content: exported,
      format: validatedFormat,
    }
  } catch (error) {
    console.error('Export conversation action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export conversation',
    }
  }
}

/**
 * Compare documents action
 */
export async function compareDocumentsAction(
  documentId1: string,
  documentId2: string
) {
  try {
    // Validate inputs
    const validatedDocId1 = documentIdSchema.parse(documentId1)
    const validatedDocId2 = documentIdSchema.parse(documentId2)

    if (validatedDocId1 === validatedDocId2) {
      throw new Error('Cannot compare a document with itself')
    }

    // Authenticate
    const user = await getAuthenticatedUser()

    // Verify access to both documents
    const [document1, document2] = await Promise.all([
      verifyDocumentAccess(validatedDocId1, user.id),
      verifyDocumentAccess(validatedDocId2, user.id),
    ])

    // Compare documents
    const comparison = await compareDocuments(
      document1.extractedText!,
      document2.extractedText!
    )

    // Save to database for both documents
    const comparisonQuery = `Compare documents: "${document1.name}" vs "${document2.name}"`
    const comparisonResponse = JSON.stringify(comparison)

    await Promise.all([
      prisma.aIQuery.create({
        data: {
          documentId: validatedDocId1,
          userId: user.id,
          query: comparisonQuery,
          response: comparisonResponse,
          model: 'gemini-2.0-flash-exp',
        },
      }),
      prisma.aIQuery.create({
        data: {
          documentId: validatedDocId2,
          userId: user.id,
          query: comparisonQuery,
          response: comparisonResponse,
          model: 'gemini-2.0-flash-exp',
        },
      }),
    ])

    // Revalidate paths
    revalidatePath(`/documents/${validatedDocId1}`)
    revalidatePath(`/documents/${validatedDocId2}`)

    return {
      success: true,
      comparison: {
        documents: {
          document1: {
            id: document1.id,
            name: document1.name,
            type: document1.type,
          },
          document2: {
            id: document2.id,
            name: document2.name,
            type: document2.type,
          },
        },
        ...comparison,
      },
    }
  } catch (error) {
    console.error('Compare documents action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compare documents',
    }
  }
}

