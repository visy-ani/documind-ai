'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { DocumentDropzone, FileUploadState } from '@/components/upload/document-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function UploadPage() {
  const { user, isLoading } = useAuth()
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadState[]>([])
  const [workspaceId, setWorkspaceId] = useState<string>('')

  // Fetch user's workspaces
  useEffect(() => {
    async function fetchWorkspaceId() {
      try {
        const response = await fetch('/api/user/me')
        if (response.ok) {
          const userData = await response.json()
          if (userData.workspaces && userData.workspaces.length > 0) {
            setWorkspaceId(userData.workspaces[0].workspace.id)
          }
        }
      } catch (error) {
        console.error('Error fetching workspace:', error)
      }
    }
    fetchWorkspaceId()
  }, [])

  const handleUploadComplete = (files: FileUploadState[]) => {
    setUploadedFiles(files)
    console.log('Upload complete:', files)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!workspaceId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Upload Documents</h1>
          <p className="text-muted-foreground">
            Upload and manage your documents for AI analysis
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Document Upload</CardTitle>
                <CardDescription>
                  Drag & drop or click to upload files. Supports PDF, DOCX, XLSX, PNG, JPG up to 10MB each.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentDropzone
                  workspaceId={workspaceId}
                  onUploadComplete={handleUploadComplete}
                  maxFiles={10}
                />
              </CardContent>
            </Card>
          </div>

          {/* Info Section */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Supported Formats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <div>
                    <p className="font-medium">PDF Documents</p>
                    <p className="text-xs text-muted-foreground">Text extraction & analysis</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <div>
                    <p className="font-medium">Word Documents (.docx)</p>
                    <p className="text-xs text-muted-foreground">Full text processing</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <div>
                    <p className="font-medium">Excel Spreadsheets (.xlsx)</p>
                    <p className="text-xs text-muted-foreground">Data extraction & tables</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🖼️</span>
                  <div>
                    <p className="font-medium">Images (PNG, JPG)</p>
                    <p className="text-xs text-muted-foreground">OCR with Gemini Vision</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upload Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max file size:</span>
                  <span className="font-medium">10 MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max files per upload:</span>
                  <span className="font-medium">10 files</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your plan:</span>
                  <span className="font-medium capitalize">{user?.usageTier || 'Free'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🎉 Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <p>✅ Drag & drop interface</p>
                <p>✅ Multi-file uploads</p>
                <p>✅ Real-time progress tracking</p>
                <p>✅ Image previews</p>
                <p>✅ File validation</p>
                <p>✅ Error handling</p>
                <p>✅ Beautiful UI</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Upload Results */}
        {uploadedFiles.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Upload Results</CardTitle>
              <CardDescription>Summary of uploaded files</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <span className="text-sm">{file.file.name}</span>
                    <span
                      className={`text-xs font-medium ${
                        file.status === 'success'
                          ? 'text-green-600'
                          : file.status === 'error'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      }`}
                    >
                      {file.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

