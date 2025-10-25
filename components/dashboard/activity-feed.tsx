'use client'

import { motion } from 'framer-motion'
import { Sparkles, FileText, MessageSquare, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Activity {
  id: string
  type: 'query' | 'upload' | 'summary' | 'extract'
  documentName: string
  query?: string
  userName: string
  userAvatar?: string
  timestamp: Date
}

interface ActivityFeedProps {
  activities: Activity[]
  isEmpty?: boolean
}

export function ActivityFeed({ activities, isEmpty = false }: ActivityFeedProps) {
  if (isEmpty) {
    return null
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'query':
        return MessageSquare
      case 'upload':
        return FileText
      case 'summary':
        return Sparkles
      case 'extract':
        return CheckCircle
      default:
        return Sparkles
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'query':
        return 'bg-blue-500'
      case 'upload':
        return 'bg-green-500'
      case 'summary':
        return 'bg-purple-500'
      case 'extract':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'query':
        return 'AI Query'
      case 'upload':
        return 'Document Upload'
      case 'summary':
        return 'Summary Generated'
      case 'extract':
        return 'Data Extracted'
      default:
        return 'Activity'
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>AI Activity Feed</CardTitle>
        <CardDescription>Recent AI queries and document analysis</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {activities.slice(0, 6).map((activity, index) => {
            const Icon = getActivityIcon(activity.type)
            const color = getActivityColor(activity.type)
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex gap-4"
              >
                <div className="relative">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', color)}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  {index !== activities.length - 1 && (
                    <div className="absolute left-5 top-10 h-6 w-px bg-border" />
                  )}
                </div>

                <div className="flex-1 space-y-1 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {getActivityLabel(activity.type)}
                      </p>
                      <Link 
                        href={`/documents/${activity.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {activity.documentName}
                      </Link>
                      {activity.query && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          &quot;{activity.query}&quot;
                        </p>
                      )}
                    </div>
                    <time className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </time>
                  </div>

                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={activity.userAvatar} alt={activity.userName} />
                      <AvatarFallback className="text-xs">
                        {activity.userName[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{activity.userName}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

