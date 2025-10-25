'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { Upload, X, FileText, File, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  validateFile,
  getFileType,
  formatFileSize,
  getFileIcon,
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
} from '@/lib/validations/upload'

export interface UploadFile extends File {
  preview?: string
  id?: string
}

export interface FileUploadState {
  file: UploadFile
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  documentId?: string
}

interface DocumentDropzoneProps {
  onUploadComplete?: (files: FileUploadState[]) => void
  maxFiles?: number
  workspaceId: string
}

export function DocumentDropzone({
  onUploadComplete,
  maxFiles = 10,
  workspaceId,
}: DocumentDropzoneProps) {
  const [files, setFiles] = useState<FileUploadState[]>([])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Validate each file
      const validatedFiles: FileUploadState[] = []
      
      acceptedFiles.forEach((file) => {
        const validation = validateFile(file)
        
        if (!validation.valid) {
          toast.error(`${file.name}: ${validation.error}`)
          return
        }

        // Create preview for images
        const uploadFile: UploadFile = Object.assign(file, {
          preview: file.type.startsWith('image/') 
            ? URL.createObjectURL(file)
            : undefined,
        })

        validatedFiles.push({
          file: uploadFile,
          progress: 0,
          status: 'pending',
        })
      })

      if (validatedFiles.length === 0) return

      // Check max files limit
      const totalFiles = files.length + validatedFiles.length
      if (totalFiles > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`)
        return
      }

      setFiles((prev) => [...prev, ...validatedFiles])
      toast.success(`${validatedFiles.length} file(s) ready to upload`)
    },
    [files.length, maxFiles]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    maxFiles,
  })

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev]
      // Revoke preview URL if exists
      if (newFiles[index].file.preview) {
        URL.revokeObjectURL(newFiles[index].file.preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('No files to upload')
      return
    }

    const pendingFiles = files.filter((f) => f.status === 'pending')
    if (pendingFiles.length === 0) {
      toast.error('No pending files to upload')
      return
    }

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue

      try {
        // Update status to uploading
        setFiles((prev) => {
          const newFiles = [...prev]
          newFiles[i].status = 'uploading'
          newFiles[i].progress = 0
          return newFiles
        })

        // Create form data
        const formData = new FormData()
        formData.append('file', files[i].file)
        formData.append('workspaceId', workspaceId)

        // Upload with progress tracking
        const result = await uploadWithProgress(formData, (progress) => {
          setFiles((prev) => {
            const newFiles = [...prev]
            newFiles[i].progress = progress
            return newFiles
          })
        })

        // Mark as success with document ID
        setFiles((prev) => {
          const newFiles = [...prev]
          newFiles[i].status = 'success'
          newFiles[i].progress = 100
          newFiles[i].documentId = result.documentId
          return newFiles
        })

        toast.success(`${files[i].file.name} uploaded successfully`)
      } catch (error) {
        console.error('Upload error:', error)
        
        setFiles((prev) => {
          const newFiles = [...prev]
          newFiles[i].status = 'error'
          newFiles[i].error = error instanceof Error ? error.message : 'Upload failed'
          return newFiles
        })

        toast.error(`Failed to upload ${files[i].file.name}`)
      }
    }

    // Call completion callback
    if (onUploadComplete) {
      onUploadComplete(files)
    }
  }

  const uploadWithProgress = async (
    formData: FormData,
    onProgress: (progress: number) => void
  ): Promise<{ documentId: string }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          onProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            resolve({ documentId: response.document?.id || '' })
          } catch {
            resolve({ documentId: '' })
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText)
            reject(new Error(error.error || xhr.statusText))
          } catch {
            reject(new Error(xhr.statusText))
          }
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'))
      })

      xhr.open('POST', '/api/upload')
      xhr.send(formData)
    })
  }

  const clearAll = () => {
    files.forEach((f) => {
      if (f.file.preview) {
        URL.revokeObjectURL(f.file.preview)
      }
    })
    setFiles([])
    toast.success('All files cleared')
  }

  const hasFiles = files.length > 0
  const hasPending = files.some((f) => f.status === 'pending')
  const isUploading = files.some((f) => f.status === 'uploading')

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card
        {...getRootProps()}
        className={`cursor-pointer border-2 border-dashed transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {isDragActive ? 'Drop files here' : 'Upload documents'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Drag & drop files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports PDF, DOCX, XLSX, PNG, JPG (max {MAX_FILE_SIZE / 1024 / 1024}MB per file)
            </p>
          </div>

          <Button type="button" variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Browse Files
          </Button>
        </div>
      </Card>

      {/* File List */}
      {hasFiles && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Files ({files.length}/{maxFiles})
            </h4>
            <div className="flex gap-2">
              {hasPending && (
                <Button
                  onClick={uploadFiles}
                  disabled={isUploading}
                  size="sm"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload All
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={clearAll}
                disabled={isUploading}
                variant="outline"
                size="sm"
              >
                Clear All
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {files.map((fileState, index) => (
              <FileItem
                key={`${fileState.file.name}-${index}`}
                fileState={fileState}
                onRemove={() => removeFile(index)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface FileItemProps {
  fileState: FileUploadState
  onRemove: () => void
}

function FileItem({ fileState, onRemove }: FileItemProps) {
  const { file, progress, status, error } = fileState
  const fileType = getFileType(file)
  const icon = getFileIcon(fileType)

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        {/* Preview or Icon */}
        <div className="flex-shrink-0">
          {file.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.preview}
              alt={file.name}
              className="h-12 w-12 rounded object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-2xl">
              {icon}
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)} · {fileType.toUpperCase()}
              </p>
            </div>

            {/* Status Icon */}
            <div className="flex-shrink-0">
              {status === 'pending' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onRemove}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {status === 'uploading' && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
              {status === 'success' && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              {status === 'error' && (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {(status === 'uploading' || status === 'success') && (
            <Progress value={progress} className="h-1.5" />
          )}

          {/* Error Message */}
          {status === 'error' && error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>
      </div>
    </Card>
  )
}

