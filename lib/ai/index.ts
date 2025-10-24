/**
 * DocuMind AI - Core AI Analysis System
 * Powered by Google Gemini 2.0 Flash
 */

// Export client
export { geminiClient, GeminiClient } from './gemini-client'

// Export document analyzer functions
export {
  analyzeDocument,
  analyzeDocumentStream,
  extractEntities,
  generateSummary,
  compareDocuments,
} from './document-analyzer'

// Export conversation manager
export { conversationManager, ConversationManager } from './conversation-manager'

// Export visualization generator
export { generateVisualization } from './visualization'

// Export types
export * from '@/types/ai'

