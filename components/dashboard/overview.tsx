'use client'

import { motion } from 'framer-motion'
import { FileText, Sparkles, HardDrive, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  index: number
}

function StatCard({ title, value, icon: Icon, color, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold">{value}</p>
            </div>
            <div
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-full',
                color
              )}
            >
              <Icon className="h-7 w-7 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface OverviewProps {
  stats: {
    documents: number
    queries: number
    storage: string
    members: number
  }
}

export function Overview({ stats }: OverviewProps) {
  const statCards = [
    {
      title: 'Uploaded Documents',
      value: stats.documents,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      title: 'AI Queries Run',
      value: stats.queries,
      icon: Sparkles,
      color: 'bg-purple-500',
    },
    {
      title: 'Storage Used',
      value: stats.storage,
      icon: HardDrive,
      color: 'bg-green-500',
    },
    {
      title: 'Team Members',
      value: stats.members,
      icon: Users,
      color: 'bg-orange-500',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <StatCard key={stat.title} {...stat} index={index} />
      ))}
    </div>
  )
}

