import { prisma } from '@/lib/prisma/client'
import { geminiClient } from './gemini-client'
import {
  ConversationMessage,
  ConversationContext,
  AIError,
} from '@/types/ai'

// Context window limit for Gemini 2.0 Flash (conservative estimate)
const MAX_CONTEXT_TOKENS = 900000 // Leave room for response

/**
 * Conversation Manager
 * Maintains conversation context per document
 * Handles context window management and smart trimming
 */
export class ConversationManager {
  /**
   * Get conversation context for a document
   */
  async getContext(documentId: string, userId: string): Promise<ConversationContext> {
    try {
      // Fetch conversation messages from database
      const queries = await prisma.aIQuery.findMany({
        where: {
          documentId,
          userId,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 50, // Limit to last 50 messages
      })

      const messages: ConversationMessage[] = []
      let totalTokens = 0

      for (const query of queries) {
        // Add user message
        const userTokens = await geminiClient.countTokens(query.query)
        messages.push({
          id: `${query.id}-user`,
          role: 'user',
          content: query.query,
          timestamp: query.createdAt,
          metadata: {
            tokensUsed: userTokens,
          },
        })
        totalTokens += userTokens

        // Add assistant message
        const assistantTokens = await geminiClient.countTokens(query.response)
        messages.push({
          id: `${query.id}-assistant`,
          role: 'assistant',
          content: query.response,
          timestamp: query.createdAt,
          metadata: {
            tokensUsed: assistantTokens,
            model: query.model,
          },
        })
        totalTokens += assistantTokens
      }

      return {
        documentId,
        userId,
        messages,
        totalTokens,
        lastUpdated: queries.length > 0 ? queries[queries.length - 1].createdAt : new Date(),
      }
    } catch (error) {
      console.error('Error getting conversation context:', error)
      throw new AIError(
        'Failed to retrieve conversation context',
        'CONTEXT_ERROR',
        false,
        error
      )
    }
  }

  /**
   * Add message to conversation context
   */
  async addMessage(
    documentId: string,
    userId: string,
    query: string,
    response: string,
    model: string = 'gemini-2.0-flash-exp'
  ): Promise<void> {
    try {
      await prisma.aIQuery.create({
        data: {
          documentId,
          userId,
          query,
          response,
          model,
        },
      })
    } catch (error) {
      console.error('Error adding message to context:', error)
      throw new AIError(
        'Failed to save conversation message',
        'SAVE_ERROR',
        false,
        error
      )
    }
  }

  /**
   * Prepare conversation history for Gemini API
   * Applies smart context trimming if needed
   */
  async prepareHistory(
    context: ConversationContext,
    documentText?: string
  ): Promise<Array<{ role: string; parts: string }>> {
    try {
      // Calculate available tokens
      let availableTokens = MAX_CONTEXT_TOKENS
      
      if (documentText) {
        const documentTokens = await geminiClient.countTokens(documentText)
        availableTokens -= documentTokens
      }

      // If context fits, return all messages
      if (context.totalTokens <= availableTokens) {
        return context.messages.map((msg) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          parts: msg.content,
        }))
      }

      // Apply smart trimming
      return await this.trimContext(context, availableTokens)
    } catch (error) {
      console.error('Error preparing history:', error)
      return []
    }
  }

  /**
   * Smart context trimming
   * Keeps most recent messages and important context
   */
  private async trimContext(
    context: ConversationContext,
    targetTokens: number
  ): Promise<Array<{ role: string; parts: string }>> {
    const messages = [...context.messages].reverse() // Start from most recent
    const trimmedHistory: Array<{ role: string; parts: string }> = []
    let currentTokens = 0

    // Strategy: Keep most recent messages, prioritize user questions and system messages
    for (const message of messages) {
      const messageTokens = message.metadata?.tokensUsed || 
        await geminiClient.countTokens(message.content)

      if (currentTokens + messageTokens > targetTokens) {
        // Check if we can fit a summary instead
        if (trimmedHistory.length === 0) {
          // If we can't fit even one message, add a truncated version
          const truncated = message.content.substring(0, 500) + '...'
          trimmedHistory.push({
            role: message.role === 'assistant' ? 'assistant' : 'user',
            parts: truncated,
          })
        }
        break
      }

      trimmedHistory.push({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        parts: message.content,
      })
      currentTokens += messageTokens
    }

    // Reverse back to chronological order
    return trimmedHistory.reverse()
  }

  /**
   * Clear conversation context for a document
   */
  async clearContext(documentId: string, userId: string): Promise<void> {
    try {
      await prisma.aIQuery.deleteMany({
        where: {
          documentId,
          userId,
        },
      })
    } catch (error) {
      console.error('Error clearing context:', error)
      throw new AIError(
        'Failed to clear conversation context',
        'CLEAR_ERROR',
        false,
        error
      )
    }
  }

  /**
   * Get conversation summary
   * Useful for displaying chat history
   */
  async getConversationSummary(
    documentId: string,
    userId: string
  ): Promise<{
    messageCount: number
    totalTokens: number
    firstMessage?: Date
    lastMessage?: Date
    topics?: string[]
  }> {
    try {
      const queries = await prisma.aIQuery.findMany({
        where: {
          documentId,
          userId,
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          query: true,
          createdAt: true,
        },
      })

      if (queries.length === 0) {
        return {
          messageCount: 0,
          totalTokens: 0,
        }
      }

      // Count tokens
      let totalTokens = 0
      for (const query of queries) {
        totalTokens += await geminiClient.countTokens(query.query)
      }

      // Extract topics (simple keyword extraction)
      const topics = this.extractTopics(queries.map((q) => q.query))

      return {
        messageCount: queries.length * 2, // user + assistant messages
        totalTokens,
        firstMessage: queries[0].createdAt,
        lastMessage: queries[queries.length - 1].createdAt,
        topics,
      }
    } catch (error) {
      console.error('Error getting conversation summary:', error)
      return {
        messageCount: 0,
        totalTokens: 0,
      }
    }
  }

  /**
   * Extract topics from queries (simple implementation)
   */
  private extractTopics(queries: string[]): string[] {
    const allText = queries.join(' ').toLowerCase()
    const words = allText.split(/\W+/)
    
    // Count word frequency
    const frequency: Record<string, number> = {}
    const stopWords = new Set(['what', 'how', 'where', 'when', 'why', 'who', 'the', 'is', 'are', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'a', 'an', 'this', 'that', 'these', 'those', 'can', 'could', 'would', 'should', 'will', 'shall'])

    for (const word of words) {
      if (word.length > 3 && !stopWords.has(word)) {
        frequency[word] = (frequency[word] || 0) + 1
      }
    }

    // Get top 5 topics
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word)
  }

  /**
   * Export conversation history
   */
  async exportConversation(
    documentId: string,
    userId: string,
    format: 'json' | 'markdown' = 'json'
  ): Promise<string> {
    try {
      const context = await this.getContext(documentId, userId)

      if (format === 'json') {
        return JSON.stringify(context, null, 2)
      }

      // Markdown format
      let markdown = `# Conversation History\n\n`
      markdown += `**Document ID:** ${documentId}\n`
      markdown += `**Total Messages:** ${context.messages.length}\n`
      markdown += `**Last Updated:** ${context.lastUpdated.toLocaleString()}\n\n`
      markdown += `---\n\n`

      for (const message of context.messages) {
        const role = message.role === 'user' ? '👤 **You**' : '🤖 **Assistant**'
        markdown += `### ${role} - ${message.timestamp.toLocaleString()}\n\n`
        markdown += `${message.content}\n\n`
        markdown += `---\n\n`
      }

      return markdown
    } catch (error) {
      console.error('Error exporting conversation:', error)
      throw new AIError(
        'Failed to export conversation',
        'EXPORT_ERROR',
        false,
        error
      )
    }
  }
}

// Export singleton instance
export const conversationManager = new ConversationManager()


