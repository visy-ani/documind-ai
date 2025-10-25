'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  User, 
  Building2, 
  MapPin, 
  Calendar, 
  Hash,
  Tag,
  RefreshCw,
  Loader2,
  Sparkles,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Entity {
  type: 'person' | 'organization' | 'location' | 'date' | 'number' | 'other'
  value: string
  context?: string
  confidence: number
  mentions: number
}

interface EntitiesDisplayProps {
  documentId: string
  autoExtract?: boolean
  className?: string
}

const entityIcons = {
  person: User,
  organization: Building2,
  location: MapPin,
  date: Calendar,
  number: Hash,
  other: Tag,
}

const entityColors = {
  person: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  organization: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  location: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  date: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  number: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export function EntitiesDisplay({
  documentId,
  autoExtract = false,
  className,
}: EntitiesDisplayProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const queryClient = useQueryClient()

  // Fetch entities
  const { data, isLoading, error } = useQuery({
    queryKey: ['document-entities', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/ai/extract?documentId=${documentId}`)
      if (!response.ok) throw new Error('Failed to load entities')
      return response.json()
    },
  })

  // Extract entities mutation
  const extractMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to extract entities')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-entities', documentId] })
      toast.success('Entities extracted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Auto-extract on mount if requested and no entities exist
  useState(() => {
    if (autoExtract && data && !data.hasEntities && !extractMutation.isPending) {
      extractMutation.mutate()
    }
  })

  // Filter entities
  const filteredEntities = data?.entities?.filter((entity: Entity) => {
    const matchesSearch = entity.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.context?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === 'all' || entity.type === selectedType
    return matchesSearch && matchesType
  }) || []

  // Loading state
  if (isLoading || extractMutation.isPending) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Extracting Entities...
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

  // No entities state
  if (!data?.hasEntities) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Entity Extraction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Extract entities like people, organizations, locations, and dates from your document.
            </p>
            <Button onClick={() => extractMutation.mutate()}>
              <Sparkles className="w-4 h-4" />
              Extract Entities
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const entitiesByType = data.entitiesByType || {}
  const stats = data.stats || { total: 0, byType: [] }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Extracted Entities
            <span className="text-sm font-normal text-muted-foreground">
              ({stats.total} found)
            </span>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => extractMutation.mutate()}
            title="Re-extract entities"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {stats.byType.map((stat: { type: string; count: number }) => {
            const Icon = entityIcons[stat.type as keyof typeof entityIcons] || Tag
            return (
              <Button
                key={stat.type}
                variant={selectedType === stat.type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(selectedType === stat.type ? 'all' : stat.type)}
                className="flex flex-col h-auto py-2"
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-xs capitalize">{stat.type}</span>
                <span className="text-xs font-bold">{stat.count}</span>
              </Button>
            )
          })}
        </div>

        {/* Tabs by Type */}
        <Tabs defaultValue="all" value={selectedType} onValueChange={setSelectedType}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="all">All</TabsTrigger>
            {Object.keys(entitiesByType).map((type) => (
              <TabsTrigger key={type} value={type} className="capitalize">
                {type}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <EntityList entities={filteredEntities} />
          </TabsContent>

          {Object.entries(entitiesByType).map(([type, entities]) => (
            <TabsContent key={type} value={type} className="mt-4">
              <EntityList entities={entities as Entity[]} />
            </TabsContent>
          ))}
        </Tabs>

        {filteredEntities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No entities found matching your search</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Entity List Component
function EntityList({ entities }: { entities: Entity[] }) {
  if (entities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No entities in this category</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {entities.map((entity, index) => {
        const Icon = entityIcons[entity.type]
        const colorClass = entityColors[entity.type]

        return (
          <Card key={`${entity.value}-${index}`} className="p-3">
            <div className="flex items-start gap-3">
              <div className={cn('p-2 rounded-md', colorClass)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm truncate">{entity.value}</h4>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', colorClass)}>
                    {entity.type}
                  </span>
                </div>
                {entity.context && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {entity.context}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>
                    Confidence: {(entity.confidence * 100).toFixed(0)}%
                  </span>
                  <span>•</span>
                  <span>
                    {entity.mentions} mention{entity.mentions !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

