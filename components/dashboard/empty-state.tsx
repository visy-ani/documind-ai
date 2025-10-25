'use client'

import { motion } from 'framer-motion'
import { Upload, Sparkles, FileText, Play } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
          >
            <FileText className="h-10 w-10 text-primary" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-md space-y-4"
          >
            <h3 className="text-2xl font-bold">No documents yet</h3>
            <p className="text-muted-foreground">
              Get started by uploading your first document. DocuMind AI will analyze it and help you
              extract insights, answer questions, and collaborate with your team.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Link href="/dashboard/upload">
                <Button size="lg" className="gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Document
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="gap-2">
                <Play className="h-5 w-5" />
                Watch Demo
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl"
          >
            <div className="space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 mx-auto">
                <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-medium">Upload</h4>
              <p className="text-xs text-muted-foreground">
                Support for PDF, Word, Excel, and images
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 mx-auto">
                <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="font-medium">Analyze</h4>
              <p className="text-xs text-muted-foreground">
                AI-powered insights and Q&A
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10 mx-auto">
                <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="font-medium">Collaborate</h4>
              <p className="text-xs text-muted-foreground">
                Share and work together in real-time
              </p>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

