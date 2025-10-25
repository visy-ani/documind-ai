'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { 
  Send, 
  Copy, 
  RefreshCw, 
  Download, 
  Sparkles,
  FileText,
  Search,
  Loader2,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    tokensUsed?: number
    model?: string
  }
}

interface AIChatProps {
  documentId: string
  className?: string
}

export function AIChat({ documentId, className }: AIChatProps) {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()

  // Load conversation history
  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['ai-conversation', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/ai/query?documentId=${documentId}`)
      if (!response.ok) throw new Error('Failed to load conversation')
      return response.json()
    },
  })

  // Set messages from history
  useEffect(() => {
    if (history?.messages) {
      setMessages(history.messages)
    }
  }, [history])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingMessage])

  // Send query mutation
  const sendQuery = async (queryText: string) => {
    if (!queryText.trim() || isStreaming) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: queryText.trim(),
      timestamp: new Date(),
    }

    // Optimistic update
    setMessages((prev) => [...prev, userMessage])
    setQuery('')
    setIsStreaming(true)
    setStreamingMessage('')

    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          query: queryText.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send query')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''

      if (!reader) throw new Error('No response stream')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'chunk') {
                fullResponse += data.content
                setStreamingMessage(fullResponse)
              } else if (data.type === 'done') {
                // Add final message
                const assistantMessage: Message = {
                  id: data.queryId || `assistant-${Date.now()}`,
                  role: 'assistant',
                  content: fullResponse,
                  timestamp: new Date(),
                  metadata: data.metadata,
                }
                setMessages((prev) => [...prev, assistantMessage])
                setStreamingMessage('')
                
                // Invalidate query to refresh history
                queryClient.invalidateQueries({ 
                  queryKey: ['ai-conversation', documentId] 
                })
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Query error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send query')
      
      // Remove optimistic user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
    } finally {
      setIsStreaming(false)
      setStreamingMessage('')
    }
  }

  // Quick actions
  const handleQuickAction = async (action: 'summarize' | 'extract' | 'entities') => {
    const queries = {
      summarize: 'Please provide a comprehensive summary of this document.',
      extract: 'Extract all key information and important data from this document.',
      entities: 'Identify and list all important entities (people, organizations, locations, dates) in this document.',
    }
    
    await sendQuery(queries[action])
  }

  // Copy message
  const copyMessage = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(messageId)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Regenerate last response
  const regenerateResponse = async () => {
    if (messages.length < 2) return
    
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === 'user')
    
    if (lastUserMessage) {
      // Remove last assistant message
      setMessages((prev) => {
        const lastAssistantIndex = prev
          .slice()
          .reverse()
          .findIndex((m) => m.role === 'assistant')
        
        if (lastAssistantIndex === -1) return prev
        
        const actualIndex = prev.length - 1 - lastAssistantIndex
        return prev.filter((_, i) => i !== actualIndex)
      })
      
      await sendQuery(lastUserMessage.content)
    }
  }

  // Export conversation
  const exportConversation = () => {
    const markdown = messages
      .map((msg) => {
        const role = msg.role === 'user' ? '👤 **You**' : '🤖 **Assistant**'
        const timestamp = msg.timestamp.toLocaleString()
        return `### ${role} - ${timestamp}\n\n${msg.content}\n\n---\n`
      })
      .join('\n')

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation-${documentId}-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Conversation exported')
  }

  // Handle textarea resize
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendQuery(query)
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages Container */}
      <ScrollArea className="flex-1 p-4">
        <div ref={scrollRef} className="space-y-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 && !streamingMessage ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
              <Sparkles className="w-12 h-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Start a conversation</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ask questions about your document or use quick actions below
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onCopy={copyMessage}
                  isCopied={copiedId === message.id}
                />
              ))}
              
              {/* Streaming message */}
              {streamingMessage && (
                <MessageBubble
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: streamingMessage,
                    timestamp: new Date(),
                  }}
                  isStreaming
                />
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4 space-y-3">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction('summarize')}
            disabled={isStreaming}
          >
            <FileText className="w-4 h-4" />
            Summarize Document
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction('extract')}
            disabled={isStreaming}
          >
            <Search className="w-4 h-4" />
            Extract Key Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction('entities')}
            disabled={isStreaming}
          >
            <Sparkles className="w-4 h-4" />
            Find Entities
          </Button>
          
          {messages.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={regenerateResponse}
                disabled={isStreaming || messages.length < 2}
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={exportConversation}
                disabled={messages.length === 0}
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this document..."
            className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] max-h-[200px]"
            disabled={isStreaming}
            rows={1}
          />
          <Button
            onClick={() => sendQuery(query)}
            disabled={!query.trim() || isStreaming}
            size="icon"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted">Enter</kbd> to send,{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-muted">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}

// Message Bubble Component
interface MessageBubbleProps {
  message: Message
  onCopy?: (content: string, messageId: string) => void
  isCopied?: boolean
  isStreaming?: boolean
}

function MessageBubble({ message, onCopy, isCopied, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3 group',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? '👤' : '🤖'}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex-1 space-y-2',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <Card
          className={cn(
            'p-3 max-w-[85%]',
            isUser
              ? 'bg-primary text-primary-foreground ml-auto'
              : 'bg-muted'
          )}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const language = match ? match[1] : ''
                    
                    return !inline ? (
                      <div className="relative group">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 rounded-t-lg border-b border-gray-700">
                          <span className="text-xs text-gray-400 font-mono">
                            {language || 'code'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              navigator.clipboard.writeText(String(children))
                              toast.success('Code copied!')
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <pre className="bg-gray-900 dark:bg-black rounded-b-lg p-4 overflow-x-auto">
                          <code className={cn("text-sm font-mono text-gray-100", className)} {...props}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    ) : (
                      <code className={cn("px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm font-mono", className)} {...props}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
              )}
            </div>
          )}
        </Card>

        {/* Message Actions & Timestamp */}
        <div
          className={cn(
            'flex items-center gap-2 text-xs text-muted-foreground',
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
          
          {!isUser && onCopy && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onCopy(message.content, message.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isCopied ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

