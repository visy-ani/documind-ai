import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai'
import {
  GeminiConfig,
  RetryConfig,
  UsageStats,
  CacheEntry,
  AIError,
  RateLimitError,
  TokenLimitError,
  InvalidResponseError,
} from '@/types/ai'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Default configurations
const DEFAULT_CONFIG: GeminiConfig = {
  model: 'gemini-2.0-flash-exp',
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponentialBackoff: true,
}

// In-memory cache
const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 3600000 // 1 hour

// Usage tracking
const usageStats: UsageStats = {
  totalRequests: 0,
  totalTokens: 0,
  totalCost: 0,
  lastReset: new Date(),
}

/**
 * Enhanced Gemini client with retry logic and error handling
 */
export class GeminiClient {
  private config: GeminiConfig
  private retryConfig: RetryConfig

  constructor(config?: Partial<GeminiConfig>, retryConfig?: Partial<RetryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  }

  /**
   * Generate content with retry logic and error handling
   */
  async generate(
    prompt: string,
    options?: {
      systemInstruction?: string
      history?: Array<{ role: string; parts: string }>
      stream?: boolean
      cache?: boolean
    }
  ): Promise<GenerateContentResult> {
    const cacheKey = options?.cache ? this.getCacheKey(prompt, options) : null
    
    // Check cache if enabled
    if (cacheKey) {
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        console.log('Returning cached response')
        return cached
      }
    }

    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.executeGeneration(prompt, options)
        
        // Cache successful result
        if (cacheKey) {
          this.setCache(cacheKey, result)
        }
        
        // Track usage
        this.trackUsage(result)
        
        return result
      } catch (error) {
        lastError = error as Error
        
        // Check if error is retryable
        if (!this.isRetryable(error)) {
          throw this.handleError(error)
        }
        
        // Don't retry if it's the last attempt
        if (attempt === this.retryConfig.maxRetries) {
          break
        }
        
        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt)
        console.log(`Retry attempt ${attempt + 1}/${this.retryConfig.maxRetries} after ${delay}ms`)
        
        await this.sleep(delay)
      }
    }
    
    throw this.handleError(lastError)
  }

  /**
   * Execute the actual generation
   */
  private async executeGeneration(
    prompt: string,
    options?: {
      systemInstruction?: string
      history?: Array<{ role: string; parts: string }>
      stream?: boolean
    }
  ): Promise<GenerateContentResult> {
    const model = genAI.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        topP: this.config.topP,
        topK: this.config.topK,
        maxOutputTokens: this.config.maxOutputTokens,
      },
      systemInstruction: options?.systemInstruction,
    })

    if (options?.history && options.history.length > 0) {
      // Use chat mode with history
      const chat = model.startChat({
        history: options.history.map((msg) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.parts }],
        })),
      })
      return await chat.sendMessage(prompt)
    } else {
      // Simple generation
      return await model.generateContent(prompt)
    }
  }

  /**
   * Generate content with streaming
   */
  async *generateStream(
    prompt: string,
    options?: {
      systemInstruction?: string
      history?: Array<{ role: string; parts: string }>
    }
  ): AsyncGenerator<string, void, unknown> {
    const model = genAI.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        topP: this.config.topP,
        topK: this.config.topK,
        maxOutputTokens: this.config.maxOutputTokens,
      },
      systemInstruction: options?.systemInstruction,
    })

    let result
    if (options?.history && options.history.length > 0) {
      const chat = model.startChat({
        history: options.history.map((msg) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.parts }],
        })),
      })
      result = await chat.sendMessageStream(prompt)
    } else {
      result = await model.generateContentStream(prompt)
    }

    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        yield text
      }
    }

    // Track usage for streaming
    const finalResponse = await result.response
    this.trackUsage(finalResponse)
  }

  /**
   * Count tokens in text
   */
  async countTokens(text: string): Promise<number> {
    try {
      const model = genAI.getGenerativeModel({ model: this.config.model })
      const result = await model.countTokens(text)
      return result.totalTokens
    } catch (error) {
      console.error('Error counting tokens:', error)
      // Rough estimation: ~4 characters per token
      return Math.ceil(text.length / 4)
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: any): boolean {
    if (error instanceof RateLimitError) return true
    
    const message = error?.message?.toLowerCase() || ''
    const status = error?.status || error?.statusCode
    
    // Retry on rate limits, timeouts, and server errors
    if (status === 429 || status === 503 || status === 500) return true
    if (message.includes('rate limit')) return true
    if (message.includes('timeout')) return true
    if (message.includes('temporarily unavailable')) return true
    
    return false
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: any): AIError {
    if (error instanceof AIError) {
      return error
    }

    const message = error?.message || 'Unknown error occurred'
    const status = error?.status || error?.statusCode

    // Rate limit errors
    if (status === 429 || message.toLowerCase().includes('rate limit')) {
      const retryAfter = error?.retryAfter || 60
      return new RateLimitError(
        'API rate limit exceeded. Please try again later.',
        retryAfter
      )
    }

    // Token limit errors
    if (message.toLowerCase().includes('token limit') || message.toLowerCase().includes('context length')) {
      return new TokenLimitError(
        'Token limit exceeded for this request',
        0,
        this.config.maxOutputTokens || 8192
      )
    }

    // Invalid response errors
    if (status === 400 || message.toLowerCase().includes('invalid')) {
      return new InvalidResponseError(
        `Invalid request: ${message}`
      )
    }

    // Generic AI error
    return new AIError(
      message,
      'GEMINI_ERROR',
      this.isRetryable(error),
      error
    )
  }

  /**
   * Calculate delay with exponential backoff
   */
  private calculateDelay(attempt: number): number {
    if (!this.retryConfig.exponentialBackoff) {
      return this.retryConfig.baseDelay
    }

    const delay = this.retryConfig.baseDelay * Math.pow(2, attempt)
    return Math.min(delay, this.retryConfig.maxDelay)
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Track usage statistics
   */
  private trackUsage(result: GenerateContentResult) {
    try {
      const response = result.response
      const usageMetadata = (response as any).usageMetadata
      
      if (usageMetadata) {
        usageStats.totalRequests++
        usageStats.totalTokens += usageMetadata.totalTokenCount || 0
        
        // Rough cost estimation (adjust based on actual Gemini pricing)
        // Gemini 2.0 Flash: ~$0.00001 per 1K tokens
        const costPerToken = 0.00001 / 1000
        usageStats.totalCost += (usageMetadata.totalTokenCount || 0) * costPerToken
      }
    } catch (error) {
      console.error('Error tracking usage:', error)
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): UsageStats {
    return { ...usageStats }
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats() {
    usageStats.totalRequests = 0
    usageStats.totalTokens = 0
    usageStats.totalCost = 0
    usageStats.lastReset = new Date()
  }

  /**
   * Cache management
   */
  private getCacheKey(prompt: string, options?: any): string {
    const optionsStr = JSON.stringify(options || {})
    return `${prompt}-${optionsStr}`
  }

  private getFromCache(key: string): any {
    const entry = cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp.getTime() > entry.ttl) {
      cache.delete(key)
      return null
    }

    entry.hits++
    return entry.value
  }

  private setCache(key: string, value: any) {
    cache.set(key, {
      key,
      value,
      timestamp: new Date(),
      ttl: CACHE_TTL,
      hits: 0,
    })

    // Simple cache size management
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: cache.size,
      entries: Array.from(cache.values()).map((entry) => ({
        key: entry.key.substring(0, 50) + '...',
        hits: entry.hits,
        age: Date.now() - entry.timestamp.getTime(),
      })),
    }
  }
}

// Export singleton instance
export const geminiClient = new GeminiClient()

