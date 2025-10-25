import { geminiClient } from './gemini-client'
import {
  AnalysisResult,
  Entity,
  Summary,
  SummaryOptions,
  Comparison,
  AIError,
} from '@/types/ai'
import { v4 as uuidv4 } from 'uuid'

/**
 * Analyze document with a specific query using Gemini 2.5 Pro
 * Supports conversation context and streaming responses
 */
export async function analyzeDocument(
  documentText: string,
  query: string,
  options?: {
    conversationHistory?: Array<{ role: string; parts: string }>
    stream?: boolean
    extractStructuredData?: boolean
  }
): Promise<AnalysisResult> {
  const startTime = Date.now()
  
  try {
    // Validate inputs
    if (!documentText || !query) {
      throw new AIError('Document text and query are required', 'INVALID_INPUT', false)
    }

    // Count tokens to ensure we're within limits
    const documentTokens = await geminiClient.countTokens(documentText)
    const queryTokens = await geminiClient.countTokens(query)
    const totalTokens = documentTokens + queryTokens
    
    // Gemini 2.0 Flash supports up to 1M tokens, but we'll be conservative
    if (totalTokens > 900000) {
      throw new AIError(
        `Total tokens (${totalTokens}) exceeds safe limit. Consider splitting the document.`,
        'TOKEN_LIMIT',
        false
      )
    }

    // Build the prompt
    const systemInstruction = `You are an expert document analyst. Analyze the provided document and answer questions with precision and clarity.

Key guidelines:
- Base your answers strictly on the document content
- Cite specific sections when relevant
- If information is not in the document, clearly state that
- Provide detailed, well-structured responses
- Extract structured data when applicable (dates, numbers, entities)
- Identify sources and provide confidence levels when appropriate`

    const prompt = options?.extractStructuredData
      ? `Document content:
${documentText}

User question: ${query}

Please provide:
1. A comprehensive answer to the question
2. Relevant quotes or sections from the document
3. Any structured data (entities, dates, numbers) found
4. Confidence level in your answer (high/medium/low)

Format your response as JSON with these fields:
{
  "answer": "detailed answer here",
  "sources": [{"text": "quote", "relevance": 0.9}],
  "structuredData": {"entities": [], "dates": [], "numbers": []},
  "confidence": "high|medium|low"
}`
      : `Document content:
${documentText}

User question: ${query}

Please provide a comprehensive, accurate answer based solely on the document content.`

    // Generate response
    const result = await geminiClient.generate(prompt, {
      systemInstruction,
      history: options?.conversationHistory,
      cache: true, // Enable caching for repeated queries
    })

    const response = result.response
    const responseText = response.text()

    // Try to parse structured data if requested
    let structuredData: Record<string, any> | undefined
    let parsedResponse = responseText
    let confidence: number | undefined
    let sources: Array<{ text: string; relevance: number }> | undefined

    if (options?.extractStructuredData) {
      try {
        // Try to extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          parsedResponse = parsed.answer || responseText
          structuredData = parsed.structuredData
          sources = parsed.sources
          
          // Convert confidence to number
          const confMap = { high: 0.9, medium: 0.7, low: 0.5 }
          confidence = confMap[parsed.confidence as keyof typeof confMap] || 0.7
        }
      } catch (e) {
        // If parsing fails, just use the full response
        console.log('Could not parse structured data, using full response')
      }
    }

    // Get token usage from response metadata
    const usageMetadata = (response as any).usageMetadata
    const tokensUsed = usageMetadata?.totalTokenCount || totalTokens

    const processingTime = Date.now() - startTime

    return {
      id: uuidv4(),
      query,
      response: parsedResponse,
      metadata: {
        model: 'gemini-2.0-flash-exp',
        tokensUsed,
        processingTime,
        timestamp: new Date().toISOString(),
      },
      structuredData,
      confidence,
      sources,
    }
  } catch (error) {
    console.error('Document analysis error:', error)
    
    if (error instanceof AIError) {
      throw error
    }
    
    throw new AIError(
      error instanceof Error ? error.message : 'Failed to analyze document',
      'ANALYSIS_ERROR',
      false,
      error
    )
  }
}

/**
 * Analyze document with streaming response
 */
export async function* analyzeDocumentStream(
  documentText: string,
  query: string,
  options?: {
    conversationHistory?: Array<{ role: string; parts: string }>
  }
): AsyncGenerator<string, AnalysisResult, unknown> {
  const startTime = Date.now()
  let fullResponse = ''
  
  try {
    const systemInstruction = `You are an expert document analyst. Analyze the provided document and answer questions with precision and clarity.`

    const prompt = `Document content:
${documentText}

User question: ${query}

Please provide a comprehensive, accurate answer based solely on the document content.`

    // Stream the response
    for await (const chunk of geminiClient.generateStream(prompt, {
      systemInstruction,
      history: options?.conversationHistory,
    })) {
      fullResponse += chunk
      yield chunk
    }

    // Return final result metadata
    const processingTime = Date.now() - startTime
    const tokensUsed = await geminiClient.countTokens(fullResponse)

    return {
      id: uuidv4(),
      query,
      response: fullResponse,
      metadata: {
        model: 'gemini-2.0-flash-exp',
        tokensUsed,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('Document analysis stream error:', error)
    throw new AIError(
      error instanceof Error ? error.message : 'Failed to analyze document',
      'ANALYSIS_ERROR',
      false,
      error
    )
  }
}

/**
 * Extract entities from document text
 */
export async function extractEntities(documentText: string): Promise<Entity[]> {
  try {
    const prompt = `Analyze the following document and extract all important entities. Return them as a JSON array.

Document:
${documentText}

Extract:
- People (names of individuals)
- Organizations (companies, institutions)
- Locations (cities, countries, addresses)
- Dates (specific dates and time periods)
- Numbers (monetary amounts, quantities, percentages)
- Other significant entities

For each entity, provide:
{
  "type": "person|organization|location|date|number|other",
  "value": "the entity text",
  "context": "surrounding context (1-2 sentences)",
  "confidence": 0.0-1.0,
  "mentions": count
}

Return only the JSON array, no additional text.`

    const result = await geminiClient.generate(prompt, {
      systemInstruction: 'You are an expert at named entity recognition. Extract entities accurately and return valid JSON.',
      cache: true,
    })

    const responseText = result.response.text()
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('Could not parse entities from response')
    }

    const entities = JSON.parse(jsonMatch[0]) as Entity[]
    return entities
  } catch (error) {
    console.error('Entity extraction error:', error)
    throw new AIError(
      error instanceof Error ? error.message : 'Failed to extract entities',
      'EXTRACTION_ERROR',
      false,
      error
    )
  }
}

/**
 * Generate summary of document
 */
export async function generateSummary(
  documentText: string,
  options: SummaryOptions = {
    format: 'detailed',
    style: 'paragraph',
    includeKeyInsights: true,
    includeActionItems: true,
  }
): Promise<Summary> {
  try {
    const maxLength = options.maxLength || (options.format === 'brief' ? 500 : 2000)
    
    const prompt = `Summarize the following document according to these specifications:

Format: ${options.format} (${options.format === 'brief' ? 'concise, high-level' : 'comprehensive, detailed'})
Style: ${options.style === 'bullet-points' ? 'Use bullet points for clarity' : 'Write in well-structured paragraphs'}
Max length: approximately ${maxLength} words
Include key insights: ${options.includeKeyInsights ? 'Yes' : 'No'}
Include action items: ${options.includeActionItems ? 'Yes' : 'No'}

Document:
${documentText}

${options.includeKeyInsights || options.includeActionItems ? `
Please structure your response as JSON:
{
  "summary": "the summary text",
  ${options.includeKeyInsights ? '"keyInsights": ["insight 1", "insight 2", ...],' : ''}
  ${options.includeActionItems ? '"actionItems": ["action 1", "action 2", ...]' : ''}
}` : 'Provide the summary directly.'}
`

    const result = await geminiClient.generate(prompt, {
      systemInstruction: 'You are an expert at document summarization. Create clear, accurate summaries that capture the essence of the content.',
      cache: true,
    })

    const responseText = result.response.text()
    let summaryText = responseText
    let keyInsights: string[] | undefined
    let actionItems: string[] | undefined

    // Try to parse JSON if structured output was requested
    if (options.includeKeyInsights || options.includeActionItems) {
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          summaryText = parsed.summary || responseText
          keyInsights = parsed.keyInsights
          actionItems = parsed.actionItems
        }
      } catch (e) {
        console.log('Could not parse structured summary, using full response')
      }
    }

    const originalLength = documentText.split(/\s+/).length
    const summaryLength = summaryText.split(/\s+/).length
    const compressionRatio = originalLength > 0 ? summaryLength / originalLength : 0

    return {
      text: summaryText,
      keyInsights,
      actionItems,
      metadata: {
        originalLength,
        summaryLength,
        compressionRatio: Math.round(compressionRatio * 100) / 100,
        model: 'gemini-2.0-flash-exp',
        timestamp: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('Summary generation error:', error)
    throw new AIError(
      error instanceof Error ? error.message : 'Failed to generate summary',
      'SUMMARY_ERROR',
      false,
      error
    )
  }
}

/**
 * Compare two documents
 */
export async function compareDocuments(
  doc1Text: string,
  doc2Text: string
): Promise<Comparison> {
  try {
    const prompt = `Compare these two documents and identify:
1. Similarities (common themes, topics, information)
2. Differences (contradictions, unique information)
3. Conflicts (where they disagree on facts or conclusions)

Document 1:
${doc1Text}

---

Document 2:
${doc2Text}

Provide your analysis as JSON:
{
  "similarities": ["similarity 1", "similarity 2", ...],
  "differences": ["difference 1", "difference 2", ...],
  "conflicts": [
    {
      "topic": "topic name",
      "doc1Statement": "what doc1 says",
      "doc2Statement": "what doc2 says",
      "severity": "low|medium|high"
    }
  ],
  "overallSimilarity": 0.0-1.0,
  "analysis": "comprehensive analysis paragraph"
}`

    const result = await geminiClient.generate(prompt, {
      systemInstruction: 'You are an expert at document comparison and analysis. Identify similarities, differences, and conflicts accurately.',
      cache: false, // Don't cache comparisons as they're usually unique
    })

    const responseText = result.response.text()
    
    // Extract JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse comparison from response')
    }

    const comparison = JSON.parse(jsonMatch[0])

    return {
      similarities: comparison.similarities || [],
      differences: comparison.differences || [],
      conflicts: comparison.conflicts || [],
      overallSimilarity: comparison.overallSimilarity || 0.5,
      analysis: comparison.analysis || responseText,
      metadata: {
        model: 'gemini-2.0-flash-exp',
        timestamp: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('Document comparison error:', error)
    throw new AIError(
      error instanceof Error ? error.message : 'Failed to compare documents',
      'COMPARISON_ERROR',
      false,
      error
    )
  }
}


