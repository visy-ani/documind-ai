# AI Query Route Documentation

## Overview

The AI Query route (`/app/api/ai/query/route.ts`) is the core API endpoint that enables users to interact with their documents using Gemini AI. It provides streaming responses, conversation context management, rate limiting, and comprehensive error handling.

---

## API Endpoints

### POST /api/ai/query

Query a document with AI using streaming response.

**Request Body:**
```json
{
  "documentId": "uuid-string",
  "query": "Your question about the document",
  "conversationId": "optional-uuid-for-context"
}
```

**Response:** Server-Sent Events (SSE) stream

**Stream Event Types:**
1. `connected` - Initial connection established
2. `chunk` - AI response chunks (streamed in real-time)
3. `done` - Processing complete with metadata
4. `error` - Error occurred during processing

**Example Stream Events:**
```javascript
// Connected event
data: {"type":"connected"}

// Chunk events (multiple)
data: {"type":"chunk","content":"The document discusses..."}
data: {"type":"chunk","content":" various topics including..."}

// Done event
data: {"type":"done","queryId":"uuid","metadata":{"processingTime":3500,"model":"gemini-2.0-flash-exp","timestamp":"2025-10-25T10:30:00Z"}}
```

**Status Codes:**
- `200` - Streaming response (with SSE)
- `400` - Bad request (missing/invalid parameters, no extracted text)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (no access to document)
- `404` - Document not found
- `429` - Rate limit exceeded
- `500` - Internal server error

---

### GET /api/ai/query?documentId=xxx

Get query history for a document.

**Query Parameters:**
- `documentId` (required) - UUID of the document

**Response:**
```json
{
  "success": true,
  "documentId": "uuid",
  "messages": [
    {
      "id": "msg-uuid",
      "role": "user",
      "content": "What is this about?",
      "timestamp": "2025-10-25T10:00:00Z",
      "metadata": {
        "tokensUsed": 150
      }
    },
    {
      "id": "msg-uuid-2",
      "role": "assistant",
      "content": "This document discusses...",
      "timestamp": "2025-10-25T10:00:05Z",
      "metadata": {
        "tokensUsed": 300,
        "model": "gemini-2.0-flash-exp"
      }
    }
  ],
  "totalTokens": 450,
  "messageCount": 2,
  "lastUpdated": "2025-10-25T10:00:05Z"
}
```

---

### DELETE /api/ai/query?queryId=xxx

Delete a specific query from history.

**Query Parameters:**
- `queryId` (required) - UUID of the query to delete

**Response:**
```json
{
  "success": true,
  "message": "Query deleted successfully"
}
```

---

## Implementation Details

### 1. Streaming Response with Server-Sent Events (SSE)

The route uses **Server-Sent Events (SSE)** to stream AI responses in real-time. This provides a better user experience by showing the response as it's being generated.

**How it works:**

```typescript
// Create a custom ReadableStream
const customReadable = new ReadableStream({
  async start(controller) {
    // Initialize connection
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))
    
    // Stream AI response chunk by chunk
    for await (const chunk of analyzeDocumentStream(...)) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`)
      )
    }
    
    // Send completion
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', ... })}\n\n`))
    controller.close()
  }
})

// Return as SSE stream
return new NextResponse(customReadable, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  }
})
```

**Key Headers:**
- `Content-Type: text/event-stream` - Indicates SSE stream
- `Cache-Control: no-cache` - Prevents caching
- `Connection: keep-alive` - Keeps connection open
- `X-Accel-Buffering: no` - Disables Nginx buffering (important for deployment)

**Benefits:**
- ✅ Real-time response streaming
- ✅ Better perceived performance
- ✅ Native browser support with EventSource
- ✅ Automatic reconnection
- ✅ Lower latency than polling

---

### 2. Conversation Context Management

The route maintains conversation history to provide contextual responses.

**How it works:**

```typescript
// 1. Get conversation context from database
const context = await conversationManager.getContext(documentId, userId)

// 2. Prepare history for Gemini API (with smart trimming)
const conversationHistory = await conversationManager.prepareHistory(
  context,
  document.extractedText
)

// 3. Use history in AI generation
for await (const chunk of analyzeDocumentStream(
  document.extractedText!,
  query,
  { conversationHistory }
)) {
  // Stream response...
}

// 4. Save query to database (handled by ConversationManager)
```

**Context Management Features:**
- Fetches last 50 messages from database
- Counts tokens to ensure within limits (900K for Gemini 2.0 Flash)
- Smart trimming if context exceeds limits (keeps most recent)
- Automatic context formatting for Gemini API
- Preserves conversation flow across sessions

**Token Management:**
```typescript
// Available tokens calculation
availableTokens = MAX_CONTEXT_TOKENS - documentTokens - conversationTokens - outputTokens

// If context too large, apply smart trimming:
// - Keep most recent messages
// - Prioritize user questions
// - Truncate if necessary
```

---

### 3. Error Handling Approach

Comprehensive error handling with specific error types and user-friendly messages.

**Error Hierarchy:**
```
Error
├── AIError (base for all AI errors)
│   ├── RateLimitError (429 - too many requests)
│   ├── TokenLimitError (400 - content too large)
│   └── InvalidResponseError (400 - invalid input)
└── Standard errors
    ├── SyntaxError (400 - invalid JSON)
    └── Generic errors (500)
```

**Error Handling Pattern:**

```typescript
try {
  // Process request
} catch (error) {
  // Handle specific error types
  if (error instanceof RateLimitError) {
    return NextResponse.json({ error: error.message, retryAfter: error.retryAfter }, { status: 429 })
  }
  
  if (error instanceof AIError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
  }
  
  // Generic fallback
  return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
}
```

**User-Facing Error Messages:**
- ✅ Clear, actionable error messages
- ✅ Specific error codes for client handling
- ✅ Retry information when applicable
- ✅ Development mode shows stack traces
- ✅ Production mode hides sensitive details

**Validation Errors:**
- Missing document ID → `400 Bad Request`
- Empty query → `400 Bad Request`
- Query too long (>10K chars) → `400 Bad Request`
- Document not found → `404 Not Found`
- No extracted text → `400 Bad Request` with `TEXT_NOT_EXTRACTED` code
- Access denied → `403 Forbidden`

---

### 4. Rate Limiting Strategy

Implements simple in-memory rate limiting (10 requests per minute per user).

**Implementation:**

```typescript
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10

// In-memory map: userId -> { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string) {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)
  
  // Initialize or reset if window expired
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true }
  }
  
  // Check if limit exceeded
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((userLimit.resetTime - now) / 1000) }
  }
  
  // Increment count
  userLimit.count++
  return { allowed: true }
}
```

**Rate Limit Response Headers:**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1729857600
```

**Production Considerations:**

⚠️ **Current Implementation** (In-Memory):
- Simple and fast
- Works for single-server deployments
- Resets on server restart
- No cross-instance synchronization

✅ **Recommended for Production** (Redis):
```typescript
// Use Redis for distributed rate limiting
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
})

async function checkRateLimit(userId: string) {
  const key = `ratelimit:${userId}`
  const count = await redis.incr(key)
  
  if (count === 1) {
    await redis.expire(key, 60) // 60 seconds
  }
  
  if (count > RATE_LIMIT_MAX_REQUESTS) {
    const ttl = await redis.ttl(key)
    return { allowed: false, retryAfter: ttl }
  }
  
  return { allowed: true }
}
```

**Benefits of Redis approach:**
- ✅ Works across multiple server instances
- ✅ Persistent across deployments
- ✅ More accurate rate limiting
- ✅ Can implement sliding windows
- ✅ Scalable

---

## Security Considerations

### Authentication
- ✅ Every request requires valid Supabase session
- ✅ User identity verified via `supabase.auth.getUser()`
- ✅ Unauthorized requests return 401

### Authorization
- ✅ Document ownership verification
- ✅ Workspace membership check
- ✅ Users can only query their own documents or shared workspace documents

### Input Validation
- ✅ Document ID format validation
- ✅ Query length limits (max 10K characters)
- ✅ JSON parsing with error handling
- ✅ SQL injection prevention via Prisma

### Rate Limiting
- ✅ Prevents API abuse
- ✅ Per-user rate limiting
- ✅ Configurable limits

### Data Privacy
- ✅ User queries saved to their own records only
- ✅ No cross-user data leakage
- ✅ Workspace access properly validated

---

## Database Operations

### Queries Saved to AIQuery Table

```typescript
const savedQuery = await prisma.aIQuery.create({
  data: {
    documentId,
    userId,
    query: query.trim(),
    response: fullResponse,
    model: 'gemini-2.0-flash-exp',
  },
})
```

**Schema:**
```prisma
model AIQuery {
  id         String   @id @default(uuid())
  documentId String
  userId     String
  query      String   @db.Text
  response   String   @db.Text
  model      String   @default("gemini-2.0-flash-exp")
  createdAt  DateTime @default(now())
  
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  @@index([documentId])
}
```

**Indexing:**
- `documentId` indexed for fast conversation history retrieval
- Cascade delete when document is deleted

---

## Performance Considerations

### Streaming Benefits
- Lower time-to-first-byte (TTFB)
- Progressive rendering on client
- Better perceived performance
- Handles long responses gracefully

### Caching
- Gemini client has built-in caching for repeated queries
- Document text cached in database (no re-extraction)
- Conversation context loaded once per request

### Token Optimization
- Smart context trimming when limits approached
- Only includes relevant conversation history
- Conservative token limits (900K out of 1M available)

### Database Queries
- Single query to fetch document with workspace
- Efficient conversation history retrieval (limited to 50 messages)
- Indexed queries for performance

---

## Client Usage Example

### Using EventSource (Browser)

```typescript
async function queryDocument(documentId: string, query: string) {
  const response = await fetch('/api/ai/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ documentId, query }),
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`)
  }
  
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  
  while (true) {
    const { done, value } = await reader!.read()
    if (done) break
    
    const chunk = decoder.decode(value)
    const lines = chunk.split('\n\n')
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))
        
        if (data.type === 'chunk') {
          // Append to UI
          console.log(data.content)
        } else if (data.type === 'done') {
          console.log('Complete!', data.metadata)
        } else if (data.type === 'error') {
          console.error('Error:', data.error)
        }
      }
    }
  }
}
```

### Using fetch with ReadableStream

```typescript
const response = await fetch('/api/ai/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ documentId, query })
})

const reader = response.body.getReader()
const decoder = new TextDecoder()

let buffer = ''
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n\n')
  buffer = lines.pop() || ''
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6))
      handleEvent(event)
    }
  }
}
```

---

## Testing

### Manual Testing with curl

```bash
# POST query
curl -X POST http://localhost:3000/api/ai/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -d '{
    "documentId": "doc-uuid",
    "query": "What is this document about?"
  }' \
  --no-buffer

# GET history
curl "http://localhost:3000/api/ai/query?documentId=doc-uuid" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"

# DELETE query
curl -X DELETE "http://localhost:3000/api/ai/query?queryId=query-uuid" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"
```

### Test Cases

1. ✅ **Valid query** - Should stream response
2. ✅ **Missing documentId** - Should return 400
3. ✅ **Empty query** - Should return 400
4. ✅ **Query too long** - Should return 400
5. ✅ **Document not found** - Should return 404
6. ✅ **No access to document** - Should return 403
7. ✅ **Document not processed** - Should return 400 with TEXT_NOT_EXTRACTED
8. ✅ **Rate limit exceeded** - Should return 429 with Retry-After
9. ✅ **Unauthenticated** - Should return 401
10. ✅ **Conversation context** - Should maintain history

---

## Next Steps

After approval, the next steps will be:

1. **Create other AI routes:**
   - `/api/ai/summary` - Generate document summaries
   - `/api/ai/extract` - Extract entities
   - `/api/ai/compare` - Compare documents

2. **Build AI Chat Component:**
   - React component with streaming support
   - Message history display
   - Markdown rendering
   - Copy/export functionality

3. **Integrate into Document Page:**
   - Add chat interface to document detail page
   - Quick summary feature
   - Entities tab
   - History tab

---

## Questions & Answers

**Q: Why SSE instead of WebSockets?**
A: SSE is simpler, unidirectional (perfect for streaming), and has automatic reconnection. WebSockets are bidirectional but overkill for this use case.

**Q: Why in-memory rate limiting?**
A: For MVP simplicity. Production should use Redis for distributed rate limiting.

**Q: How is conversation context managed?**
A: Via `ConversationManager` class which fetches history from database, counts tokens, and applies smart trimming when needed.

**Q: What happens if Gemini API fails?**
A: Error is caught, sent as SSE error event to client, and logged. Client can retry.

**Q: Can multiple documents be queried at once?**
A: No, each request queries one document. For multi-document queries, implement a separate `/api/ai/multi-query` endpoint.

**Q: How are tokens tracked?**
A: Token usage is returned from Gemini API and saved with each query in the database for analytics.

---

## Conclusion

This AI Query route provides a robust, production-ready foundation for document Q&A with:
- ✅ Real-time streaming responses
- ✅ Conversation context management
- ✅ Comprehensive error handling
- ✅ Rate limiting
- ✅ Security & authorization
- ✅ Full conversation history
- ✅ Scalable architecture

Ready for approval and integration with frontend components!

