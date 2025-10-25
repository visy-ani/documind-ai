'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Loader2, 
  ArrowLeft, 
  Download, 
  Trash2, 
  MessageSquare,
  FileText,
  Tags,
  History,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { getDocument, deleteDocument } from '@/app/actions/documents'
import { formatFileSize, getFileIcon } from '@/lib/validations/upload'
import { AIChat } from '@/components/ai/ai-chat'
import { DocumentSummaryCard } from '@/components/ai/document-summary-card'
import { EntitiesDisplay } from '@/components/ai/entities-display'

// Create query client
const queryClient = new QueryClient()

interface DocumentData {
  id: string
  name: string
  type: string
  storageUrl: string
  extractedText: string | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string
  
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function loadDocument() {
      const result = await getDocument(documentId)
      if (result.success && result.data) {
        setDocument(result.data)
      } else {
        toast.error(result.error || 'Failed to load document')
        router.push('/documents')
      }
      setIsLoading(false)
    }
    loadDocument()
  }, [documentId, router])

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this document? This will also delete all conversations and analysis data.')) return

    setIsDeleting(true)
    const result = await deleteDocument(documentId)
    
    if (result.success) {
      toast.success('Document deleted successfully')
      router.push('/documents')
    } else {
      toast.error(result.error || 'Failed to delete document')
      setIsDeleting(false)
    }
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

  const metadata = (document.metadata || {}) as Record<string, unknown>
  const fileSize = (metadata.size as number) || 0
  const isProcessed = !!document.extractedText

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <Link href="/documents">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Documents
              </Button>
            </Link>
            
            <div className="flex gap-2">
              <a href={document.storageUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </a>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Document Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="text-4xl">{getFileIcon(document.type)}</div>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{document.name}</CardTitle>
                  <CardDescription className="mt-2 flex items-center gap-4">
                    <span>{formatFileSize(fileSize)}</span>
                    <span>•</span>
                    <span>{document.type.toUpperCase()}</span>
                    <span>•</span>
                    <span>Uploaded {new Date(document.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className={isProcessed ? 'text-green-600' : 'text-yellow-600'}>
                      {isProcessed ? '✓ Processed' : '⏳ Processing...'}
                    </span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Processing Warning */}
          {!isProcessed && (
            <Card className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <CardContent className="flex items-start gap-3 pt-6">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                    Document Processing
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    Your document is being processed. AI features will be available once text extraction is complete. This usually takes a few seconds.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Side: Document Preview (2/5 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Document Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Document Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">File Name:</span>
                    <p className="font-medium text-sm">{document.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Size:</span>
                    <p className="font-medium text-sm">{formatFileSize(fileSize)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <p className="font-medium text-sm">{document.type.toUpperCase()}</p>
                  </div>
                  {typeof metadata.wordCount === 'number' && (
                    <div>
                      <span className="text-sm text-muted-foreground">Word Count:</span>
                      <p className="font-medium text-sm">{metadata.wordCount.toLocaleString()}</p>
                    </div>
                  )}
                  {typeof metadata.pageCount === 'number' && (
                    <div>
                      <span className="text-sm text-muted-foreground">Pages:</span>
                      <p className="font-medium text-sm">{metadata.pageCount}</p>
                    </div>
                  )}
                  {typeof metadata.sheetCount === 'number' && (
                    <div>
                      <span className="text-sm text-muted-foreground">Sheets:</span>
                      <p className="font-medium text-sm">{metadata.sheetCount}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Extracted Text Preview */}
              {document.extractedText && (
                <Card className="flex flex-col" style={{ height: 'calc(100vh - 400px)' }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Extracted Text</CardTitle>
                    <CardDescription>
                      {document.extractedText.length} characters
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono">
                        {document.extractedText}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Side: AI Features (3/5 width) */}
            <div className="lg:col-span-3">
              <Tabs defaultValue="chat" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="chat" className="gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="summary" className="gap-2" disabled={!isProcessed}>
                    <FileText className="w-4 h-4" />
                    Summary
                  </TabsTrigger>
                  <TabsTrigger value="entities" className="gap-2" disabled={!isProcessed}>
                    <Tags className="w-4 h-4" />
                    Entities
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-2" disabled={!isProcessed}>
                    <History className="w-4 h-4" />
                    History
                  </TabsTrigger>
                </TabsList>

                {/* Chat Tab */}
                <TabsContent value="chat" className="mt-6">
                  <Card style={{ height: 'calc(100vh - 250px)' }}>
                    {isProcessed ? (
                      <AIChat documentId={documentId} className="h-full" />
                    ) : (
                      <CardContent className="flex flex-col items-center justify-center h-full">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Processing Document</h3>
                        <p className="text-sm text-muted-foreground text-center max-w-md">
                          Please wait while we extract text from your document. Chat will be available shortly.
                        </p>
                      </CardContent>
                    )}
                  </Card>
                </TabsContent>

                {/* Summary Tab */}
                <TabsContent value="summary" className="mt-6">
                  <DocumentSummaryCard 
                    documentId={documentId} 
                    autoGenerate={true}
                  />
                </TabsContent>

                {/* Entities Tab */}
                <TabsContent value="entities" className="mt-6">
                  <EntitiesDisplay 
                    documentId={documentId}
                    autoExtract={false}
                  />
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Conversation History</CardTitle>
                      <CardDescription>
                        All your past queries and AI responses for this document
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground text-center py-8">
                        View all past conversations in the Chat tab. Export functionality available in chat interface.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  )
}

