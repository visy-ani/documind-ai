'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Users,
  FileText,
  UserPlus,
  Settings,
  Loader2,
  MoreVertical,
  Crown,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface WorkspaceDetail {
  id: string
  name: string
  ownerId: string
  createdAt: string
  members: Array<{
    id: string
    userId: string
    role: string
    joinedAt: string
    user: {
      name: string
      email: string
      avatarUrl?: string
    }
  }>
  documents: Array<{
    id: string
    name: string
    type: string
    createdAt: string
  }>
}

export default function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchWorkspace = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/workspaces/${resolvedParams.id}`)
      const data = await response.json()

      if (data.success) {
        setWorkspace(data.workspace)
      } else {
        toast.error(data.error || 'Failed to load workspace')
      }
    } catch (error) {
      console.error('Failed to fetch workspace:', error)
      toast.error('Failed to load workspace')
    } finally {
      setIsLoading(false)
    }
  }, [resolvedParams.id])

  useEffect(() => {
    fetchWorkspace()
  }, [fetchWorkspace])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="p-16 text-center">
            <h3 className="text-xl font-semibold mb-2">Workspace not found</h3>
            <p className="text-muted-foreground mb-6">
              The workspace you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
            </p>
            <Link href="/workspaces">
              <Button>Back to Workspaces</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <Link href="/workspaces">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{workspace.name}</h1>
              <p className="text-muted-foreground">
                Created {formatDistanceToNow(new Date(workspace.createdAt), { addSuffix: true })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{workspace.members.length}</p>
                  <p className="text-sm text-muted-foreground">Members</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                  <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{workspace.documents.length}</p>
                  <p className="text-sm text-muted-foreground">Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <Crown className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <p className="font-medium truncate">
                    {workspace.members.find((m) => m.userId === workspace.ownerId)?.user.name ||
                      'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="members" className="w-full">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>People who have access to this workspace</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workspace.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.user.avatarUrl} alt={member.user.name} />
                          <AvatarFallback>
                            {member.user.name[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.user.name}</p>
                          <p className="text-sm text-muted-foreground">{member.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {member.role}
                        </Badge>
                        {member.userId !== workspace.ownerId && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Change Role</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Remove Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Workspace Documents</CardTitle>
                <CardDescription>Documents shared in this workspace</CardDescription>
              </CardHeader>
              <CardContent>
                {workspace.documents.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No documents yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workspace.documents.map((doc) => (
                      <Link
                        key={doc.id}
                        href={`/documents/${doc.id}`}
                        className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <FileText className="h-8 w-8 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge variant="outline" className="uppercase">
                          {doc.type}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

