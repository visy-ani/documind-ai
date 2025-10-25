'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, FileText, Search, Loader2, Copy, Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'

interface Query {
  id: string
  query: string
  response: string
  documentName: string
  documentId: string
  createdAt: string
  model: string
}

export default function AIQueriesPage() {
  const [queries, setQueries] = useState<Query[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchQueries()
  }, [])

  const fetchQueries = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/ai/queries/history')
      const data = await response.json()

      if (data.success) {
        setQueries(data.queries)
      }
    } catch (error) {
      console.error('Failed to fetch queries:', error)
      toast.error('Failed to load queries')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredQueries = queries.filter(
    (q) =>
      q.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.response.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-500" />
            AI Queries
          </h1>
          <p className="text-muted-foreground">Your AI query history</p>
        </motion.div>

        {/* Search */}
        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search queries..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{queries.length}</p>
                <p className="text-sm text-muted-foreground">Total Queries</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {new Set(queries.map((q) => q.documentId)).size}
                </p>
                <p className="text-sm text-muted-foreground">Documents Analyzed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {queries.length > 0
                    ? formatDistanceToNow(new Date(queries[0].createdAt), {
                        addSuffix: true,
                      })
                    : 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">Last Query</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Queries List */}
        {filteredQueries.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery ? 'No queries found' : 'No queries yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Upload a document and start asking questions!'}
              </p>
              {!searchQuery && (
                <Link href="/dashboard/upload">
                  <Button>Upload Document</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredQueries.map((query, index) => (
              <motion.div
                key={query.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <CardTitle className="text-lg">{query.query}</CardTitle>
                        <CardDescription className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/documents/${query.documentId}`}
                            className="flex items-center gap-1 hover:underline"
                          >
                            <FileText className="h-3 w-3" />
                            {query.documentName}
                          </Link>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(query.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                          <span>•</span>
                          <Badge variant="outline">{query.model}</Badge>
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => copyToClipboard(query.response, query.id)}
                      >
                        {copiedId === query.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg bg-muted p-4">
                      <p className="text-sm whitespace-pre-wrap">{query.response}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

