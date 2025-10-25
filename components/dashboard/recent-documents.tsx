'use client'

import { motion } from 'framer-motion'
import { FileText, Eye, Sparkles, MoreVertical, Download } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface Document {
  id: string
  name: string
  type: string
  createdAt: Date
  status?: 'processing' | 'ready' | 'error'
}

interface RecentDocumentsProps {
  documents: Document[]
  isEmpty?: boolean
}

export function RecentDocuments({ documents, isEmpty = false }: RecentDocumentsProps) {
  if (isEmpty) {
    return null
  }

  const getFileIcon = () => {
    return FileText
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'processing':
        return <Badge variant="warning">Processing</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      case 'ready':
      default:
        return <Badge variant="success">Ready</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>Your most recently uploaded files</CardDescription>
          </div>
          <Link href="/documents">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.slice(0, 5).map((doc, index) => {
            const Icon = getFileIcon()
            
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex items-center gap-4 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                
                <div className="flex-1 space-y-1 overflow-hidden">
                  <p className="font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(doc.createdAt, { addSuffix: true })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(doc.status)}
                  
                  <div className="hidden sm:flex gap-1">
                    <Link href={`/documents/${doc.id}`}>
                      <Button variant="ghost" size="icon-sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    
                    <Link href={`/documents/${doc.id}?action=analyze`}>
                      <Button variant="ghost" size="icon-sm">
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/documents/${doc.id}`}>View Details</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/documents/${doc.id}?action=analyze`}>Analyze with AI</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

