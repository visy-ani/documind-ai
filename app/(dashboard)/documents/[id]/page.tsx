'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getDocument, deleteDocument } from '@/app/actions/documents'
import { formatFileSize, getFileIcon } from '@/lib/validations/upload'

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string
  
  const [document, setDocument] = useState<any>(null)
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
    if (!confirm('Are you sure you want to delete this document?')) return

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

  const metadata = document.metadata || {}
  const fileSize = metadata.size || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link href="/documents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Documents
            </Button>
          </Link>
        </div>

        {/* Document Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{getFileIcon(document.type)}</div>
                <div>
                  <CardTitle className="text-2xl">{document.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {formatFileSize(fileSize)} · {document.type.toUpperCase()}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <span className="text-sm text-muted-foreground">Uploaded:</span>
                <p className="font-medium">{new Date(document.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Status:</span>
                <p className={`font-medium ${document.extractedText ? 'text-green-600' : 'text-yellow-600'}`}>
                  {document.extractedText ? 'Processed' : 'Processing...'}
                </p>
              </div>
              {metadata.wordCount && (
                <div>
                  <span className="text-sm text-muted-foreground">Word Count:</span>
                  <p className="font-medium">{metadata.wordCount.toLocaleString()}</p>
                </div>
              )}
              {metadata.sheetCount && (
                <div>
                  <span className="text-sm text-muted-foreground">Sheets:</span>
                  <p className="font-medium">{metadata.sheetCount}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <a href={document.storageUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </a>
              <Button
                variant="destructive"
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
          </CardContent>
        </Card>

        {/* Extracted Text */}
        {document.extractedText && (
          <Card>
            <CardHeader>
              <CardTitle>Extracted Text</CardTitle>
              <CardDescription>
                AI-extracted content from your document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm">
                  {document.extractedText}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing Message */}
        {!document.extractedText && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Processing Document</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Your document is being processed. Text extraction and analysis will appear here shortly.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

