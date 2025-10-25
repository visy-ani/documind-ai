'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, FileText, Upload, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { listDocuments, deleteDocument } from '@/app/actions/documents'
import { formatFileSize, getFileIcon } from '@/lib/validations/upload'

interface Document {
  id: string
  name: string
  type: string
  size: number
  hasExtractedText: boolean
  createdAt: Date
}

export default function DocumentsPage() {
  const { isLoading: authLoading } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch workspace and documents
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/user/me')
        if (response.ok) {
          const userData = await response.json()
          if (userData.workspaces && userData.workspaces.length > 0) {
            const wsId = userData.workspaces[0].workspace.id
            setWorkspaceId(wsId)
            await loadDocuments(wsId)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load documents')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  async function loadDocuments(wsId: string) {
    const result = await listDocuments(wsId)
    if (result.success && result.data) {
      setDocuments(result.data)
    } else {
      toast.error(result.error || 'Failed to load documents')
    }
  }

  async function handleDelete(documentId: string) {
    if (!confirm('Are you sure you want to delete this document?')) return

    setDeletingId(documentId)
    const result = await deleteDocument(documentId)
    
    if (result.success) {
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
      toast.success('Document deleted successfully')
    } else {
      toast.error(result.error || 'Failed to delete document')
    }
    
    setDeletingId(null)
  }

  async function handleRefresh() {
    if (!workspaceId) return
    setIsLoading(true)
    await loadDocuments(workspaceId)
    setIsLoading(false)
    toast.success('Documents refreshed')
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-muted-foreground">
              Manage your uploaded documents
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Link href="/upload">
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {documents.length === 0 && !isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                Upload your first document to get started with AI-powered analysis
              </p>
              <Link href="/upload">
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Documents Grid */}
        {documents.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="relative group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="text-3xl flex-shrink-0">
                        {getFileIcon(doc.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {doc.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {formatFileSize(doc.size)} · {doc.type.toUpperCase()}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={doc.hasExtractedText ? 'text-green-600' : 'text-yellow-600'}>
                        {doc.hasExtractedText ? 'Processed' : 'Processing...'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Uploaded:</span>
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Link href={`/documents/${doc.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <FileText className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

