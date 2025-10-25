// AI Analysis Types

export interface AnalysisResult {
  id: string
  query: string
  response: string
  context?: string
  metadata: {
    model: string
    tokensUsed: number
    processingTime: number
    timestamp: string
  }
  structuredData?: Record<string, unknown>
  confidence?: number
  sources?: Array<{
    text: string
    relevance: number
  }>
}

export interface Entity {
  type: 'person' | 'organization' | 'location' | 'date' | 'number' | 'other'
  value: string
  context?: string
  confidence: number
  mentions: number
}

export interface SummaryOptions {
  format: 'brief' | 'detailed'
  style: 'bullet-points' | 'paragraph'
  maxLength?: number
  includeKeyInsights?: boolean
  includeActionItems?: boolean
}

export interface Summary {
  text: string
  keyInsights?: string[]
  actionItems?: string[]
  metadata: {
    originalLength: number
    summaryLength: number
    compressionRatio: number
    model: string
    timestamp: string
  }
}

export interface Comparison {
  similarities: string[]
  differences: string[]
  conflicts?: Array<{
    topic: string
    doc1Statement: string
    doc2Statement: string
    severity: 'low' | 'medium' | 'high'
  }>
  overallSimilarity: number
  analysis: string
  metadata: {
    model: string
    timestamp: string
  }
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    tokensUsed?: number
    model?: string
  }
}

export interface ConversationContext {
  documentId: string
  userId: string
  messages: ConversationMessage[]
  totalTokens: number
  lastUpdated: Date
}

export interface GeminiConfig {
  model: string
  temperature?: number
  topP?: number
  topK?: number
  maxOutputTokens?: number
  stopSequences?: string[]
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  exponentialBackoff: boolean
}

export interface UsageStats {
  totalRequests: number
  totalTokens: number
  totalCost: number
  lastReset: Date
}

export interface CacheEntry {
  key: string
  value: unknown
  timestamp: Date
  ttl: number
  hits: number
}

// Error Types
export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AIError'
  }
}

export class RateLimitError extends AIError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 'RATE_LIMIT', true)
    this.name = 'RateLimitError'
  }
}

export class TokenLimitError extends AIError {
  constructor(message: string, public tokensUsed: number, public maxTokens: number) {
    super(message, 'TOKEN_LIMIT', false)
    this.name = 'TokenLimitError'
  }
}

export class InvalidResponseError extends AIError {
  constructor(message: string) {
    super(message, 'INVALID_RESPONSE', false)
    this.name = 'InvalidResponseError'
  }
}

// Visualization Types
export interface VisualizationRequest {
  data: Record<string, unknown> | Array<{ label: string; value: unknown }>
  type: 'chart' | 'infographic' | 'diagram'
  chartType?: 'bar' | 'line' | 'pie' | 'scatter'
  style?: 'modern' | 'minimal' | 'detailed'
  colors?: string[]
}

export interface VisualizationResult {
  imageBuffer: Buffer
  metadata: {
    width: number
    height: number
    format: string
    generated: string
  }
}


