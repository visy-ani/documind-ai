'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  FileText, 
  RefreshCw, 
  Copy, 
  Download, 
  ChevronDown, 
  ChevronUp,
  Loader2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Summary {
  text: string
  keyInsights?: string[]
  actionItems?: string[]
  metadata?: {
    originalLength?: number
    summaryLength?: number
    compressionRatio?: number
    processingTime?: number
    model?: string
    timestamp?: string
  }
}

interface DocumentSummaryCardProps {
  documentId: string
  autoGenerate?: boolean
  className?: string
}

export function DocumentSummaryCard({
  documentId,
  autoGenerate = false,
  className,
}: DocumentSummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showFullDialog, setShowFullDialog] = useState(false)
  const queryClient = useQueryClient()

  // Fetch existing summary
  const { data, isLoading } = useQuery({
    queryKey: ['document-summary', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/ai/summary?documentId=${documentId}`)
      if (!response.ok) throw new Error('Failed to load summary')
      return response.json()
    },
  })

  // Generate summary mutation
  const generateMutation = useMutation({
    mutationFn: async (options?: { format?: 'brief' | 'detailed' }) => {
      const response = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          options: {
            format: options?.format || 'detailed',
            style: 'paragraph',
            includeKeyInsights: true,
            includeActionItems: true,
          },
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate summary')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-summary', documentId] })
      toast.success('Summary generated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Auto-generate on mount if requested and no summary exists
  useEffect(() => {
    if (autoGenerate && data && !data.hasSummary && !generateMutation.isPending) {
      generateMutation.mutate(undefined)
    }
  }, [autoGenerate, data, generateMutation])

  // Copy summary
  const copySummary = () => {
    if (data?.summary?.text) {
      navigator.clipboard.writeText(data.summary.text)
      toast.success('Summary copied to clipboard')
    }
  }

  // Download summary
  const downloadSummary = () => {
    if (!data?.summary) return

    const content = `# Document Summary

${data.summary.text}

${data.summary.keyInsights ? `\n## Key Insights\n${data.summary.keyInsights.map((i: string) => `- ${i}`).join('\n')}` : ''}

${data.summary.actionItems ? `\n## Action Items\n${data.summary.actionItems.map((a: string) => `- ${a}`).join('\n')}` : ''}

---
Generated: ${new Date(data.createdAt).toLocaleString()}
Model: ${data.summary.metadata?.model || 'AI'}
`

    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `summary-${documentId}-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Summary downloaded')
  }

  // Loading state
  if (isLoading || generateMutation.isPending) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Summary...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
            <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // No summary state
  if (!data?.hasSummary) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Document Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              No summary generated yet. Generate one to get quick insights about this document.
            </p>
            <Button onClick={() => generateMutation.mutate(undefined)}>
              <Sparkles className="w-4 h-4" />
              Generate Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const summary: Summary = data.summary

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Document Summary
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={copySummary}
              title="Copy summary"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={downloadSummary}
              title="Download summary"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => generateMutation.mutate(undefined)}
              title="Regenerate summary"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Brief Summary */}
        <div className="space-y-2">
          <p className={cn(
            'text-sm text-muted-foreground',
            !isExpanded && 'line-clamp-3'
          )}>
            {summary.text}
          </p>
          {summary.text.length > 200 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show More
                </>
              )}
            </Button>
          )}
        </div>

        {/* Key Insights */}
        {summary.keyInsights && summary.keyInsights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Key Insights
            </h4>
            <ul className="space-y-1 text-sm">
              {summary.keyInsights.slice(0, isExpanded ? undefined : 3).map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-muted-foreground">{insight}</span>
                </li>
              ))}
            </ul>
            {summary.keyInsights.length > 3 && !isExpanded && (
              <p className="text-xs text-muted-foreground">
                +{summary.keyInsights.length - 3} more insights
              </p>
            )}
          </div>
        )}

        {/* Action Items */}
        {summary.actionItems && summary.actionItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Action Items
            </h4>
            <ul className="space-y-1 text-sm">
              {summary.actionItems.slice(0, isExpanded ? undefined : 3).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">□</span>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
            {summary.actionItems.length > 3 && !isExpanded && (
              <p className="text-xs text-muted-foreground">
                +{summary.actionItems.length - 3} more action items
              </p>
            )}
          </div>
        )}

        {/* View Detailed Summary Button */}
        <Dialog open={showFullDialog} onOpenChange={setShowFullDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <FileText className="w-4 h-4" />
              View Detailed Summary
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Complete Document Summary</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div>
                <h3 className="font-semibold mb-2">Summary</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {summary.text}
                </p>
              </div>

              {summary.keyInsights && summary.keyInsights.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Key Insights
                  </h3>
                  <ul className="space-y-2">
                    {summary.keyInsights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-muted-foreground">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.actionItems && summary.actionItems.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Action Items
                  </h3>
                  <ul className="space-y-2">
                    {summary.actionItems.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-1">□</span>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.metadata && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2 text-sm">Metadata</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {summary.metadata.originalLength && (
                      <div>
                        <span className="font-medium">Original:</span>{' '}
                        {summary.metadata.originalLength} words
                      </div>
                    )}
                    {summary.metadata.summaryLength && (
                      <div>
                        <span className="font-medium">Summary:</span>{' '}
                        {summary.metadata.summaryLength} words
                      </div>
                    )}
                    {summary.metadata.compressionRatio && (
                      <div>
                        <span className="font-medium">Compression:</span>{' '}
                        {(summary.metadata.compressionRatio * 100).toFixed(1)}%
                      </div>
                    )}
                    {summary.metadata.processingTime && (
                      <div>
                        <span className="font-medium">Processing:</span>{' '}
                        {(summary.metadata.processingTime / 1000).toFixed(2)}s
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={copySummary} variant="outline" className="flex-1">
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
                <Button onClick={downloadSummary} variant="outline" className="flex-1">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Metadata */}
        {data.createdAt && (
          <p className="text-xs text-muted-foreground">
            Generated {new Date(data.createdAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

