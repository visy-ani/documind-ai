'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Download,
  Sparkles,
  MessageSquare,
  Loader2,
  Send,
  Copy,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface Document {
  id: string
  name: string
  type: string
  storageUrl: string
  createdAt: string
  updatedAt: string
  tags: string[]
  workspace: string
  extractedText?: string
  metadata?: Record<string, unknown>
}

interface AIQuery {
  id: string
  query: string
  response: string
  createdAt: string
}

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoAnalyze = searchParams.get('action') === 'analyze'

  const [document, setDocument] = useState<Document | null>(null)
  const [queries, setQueries] = useState<AIQuery[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [isQuerying, setIsQuerying] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchDocument = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/documents/${resolvedParams.id}`)
      const data = await response.json()

      if (data.success) {
        setDocument(data.document)
      } else {
        toast.error('Failed to load document')
        router.push('/documents')
      }
    } catch (error) {
      console.error('Failed to fetch document:', error)
      toast.error('Failed to load document')
    } finally {
      setIsLoading(false)
    }
  }, [resolvedParams.id, router])

  const fetchQueries = useCallback(async () => {
    try {
      const response = await fetch(`/api/documents/${resolvedParams.id}/queries`)
      const data = await response.json()

      if (data.success) {
        setQueries(data.queries)
      }
    } catch (error) {
      console.error('Failed to fetch queries:', error)
    }
  }, [resolvedParams.id])

  const handleQuery = useCallback(async () => {
    if (!query.trim() || isQuerying) return

    try {
      setIsQuerying(true)
      const response = await fetch('/api/ai/query-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: resolvedParams.id,
          query: query.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setQueries([
          {
            id: data.queryId,
            query: query.trim(),
            response: data.response,
            createdAt: new Date().toISOString(),
          },
          ...queries,
        ])
        setQuery('')
        toast.success('AI analysis complete!')
      } else {
        toast.error(data.error || 'Failed to process query')
      }
    } catch (error) {
      console.error('Query error:', error)
      toast.error('Failed to process query')
    } finally {
      setIsQuerying(false)
    }
  }, [query, isQuerying, resolvedParams.id, queries])

  useEffect(() => {
    fetchDocument()
    fetchQueries()
  }, [fetchDocument, fetchQueries])

  useEffect(() => {
    if (autoAnalyze && document && !isQuerying) {
      setQuery('Please provide a summary of this document')
      // Auto-trigger analysis after a brief delay
      setTimeout(() => {
        handleQuery()
      }, 500)
    }
  }, [autoAnalyze, document, isQuerying, handleQuery])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!document) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <Link href="/documents">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{document.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{document.workspace}</Badge>
                <Badge variant="secondary">{document.type.toUpperCase()}</Badge>
                {document.tags?.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Document Info */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Document Info</CardTitle>
              <CardDescription>Metadata and details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">
                  {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Modified</p>
                <p className="text-sm">
                  {formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Size</p>
                <p className="text-sm">
                  {document.metadata?.size
                    ? `${((document.metadata.size as number) / 1024 / 1024).toFixed(2)} MB`
                    : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Queries</p>
                <p className="text-sm">{queries.length} queries</p>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI Analysis
              </CardTitle>
              <CardDescription>Ask questions about your document</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="query" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="query">Query</TabsTrigger>
                  <TabsTrigger value="history">History ({queries.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="query" className="space-y-4">
                  {/* Query Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask a question about this document..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
                      disabled={isQuerying}
                    />
                    <Button onClick={handleQuery} disabled={isQuerying || !query.trim()}>
                      {isQuerying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuery('Summarize this document')}
                    >
                      Summarize
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuery('Extract key points')}
                    >
                      Key Points
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuery('List all entities mentioned')}
                    >
                      Entities
                    </Button>
                  </div>

                  {/* Latest Response */}
                  {queries.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 space-y-4"
                    >
                      <h3 className="font-semibold">Latest Response</h3>
                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-medium">{queries[0].query}</p>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => copyToClipboard(queries[0].response, queries[0].id)}
                            >
                              {copiedId === queries[0].id ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {queries[0].response}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <ScrollArea className="h-[500px] pr-4">
                    {queries.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No queries yet. Start asking questions!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {queries.map((q, index) => (
                          <motion.div
                            key={q.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Card>
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium mb-1">{q.query}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(q.createdAt), {
                                        addSuffix: true,
                                      })}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => copyToClipboard(q.response, q.id)}
                                  >
                                    {copiedId === q.id ? (
                                      <Check className="h-3 w-3" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3">
                                  <p className="text-sm whitespace-pre-wrap">{q.response}</p>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
