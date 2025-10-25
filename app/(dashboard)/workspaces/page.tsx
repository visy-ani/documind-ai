'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Folder,
  Plus,
  Users,
  UserPlus,
  Settings,
  Loader2,
  MoreVertical,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Workspace {
  id: string
  name: string
  memberCount: number
  documentCount: number
  members: Array<{
    id: string
    name: string
    avatarUrl?: string
  }>
  isActive: boolean
  role: string
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchWorkspaces()
  }, [])

  const fetchWorkspaces = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/dashboard/workspaces')
      const data = await response.json()

      if (data.success) {
        setWorkspaces(data.workspaces)
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error)
      toast.error('Failed to load workspaces')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim() || isCreating) return

    try {
      setIsCreating(true)
      const response = await fetch('/api/dashboard/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        setWorkspaces([data.workspace, ...workspaces])
        setNewWorkspaceName('')
        setDialogOpen(false)
        toast.success('Workspace created successfully!')
      } else {
        toast.error(data.error || 'Failed to create workspace')
      }
    } catch (error) {
      console.error('Create workspace error:', error)
      toast.error('Failed to create workspace')
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold">Workspaces</h1>
            <p className="text-muted-foreground">Manage your team workspaces</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                New Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workspace</DialogTitle>
                <DialogDescription>
                  Create a shared workspace to collaborate with your team
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Workspace Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Marketing Team"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateWorkspace} disabled={isCreating || !newWorkspaceName.trim()}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Workspaces Grid */}
        {workspaces.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Folder className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No workspaces yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first workspace to collaborate with your team
              </p>
              <Button onClick={() => setDialogOpen(true)} size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Create Workspace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace, index) => (
              <motion.div
                key={workspace.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Folder className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="line-clamp-1">{workspace.name}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{workspace.role}</Badge>
                            {workspace.isActive && (
                              <div className="flex items-center gap-1">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span className="text-xs">Active</span>
                              </div>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Invite Members
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{workspace.memberCount} members</span>
                      </div>
                      <div className="text-muted-foreground">
                        {workspace.documentCount} docs
                      </div>
                    </div>

                    <div className="flex items-center -space-x-2">
                      {workspace.members.map((member) => (
                        <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                          <AvatarImage src={member.avatarUrl} alt={member.name} />
                          <AvatarFallback className="text-xs">
                            {member.name[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {workspace.memberCount > workspace.members.length && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                          +{workspace.memberCount - workspace.members.length}
                        </div>
                      )}
                    </div>

                    <Link href={`/workspaces/${workspace.id}`}>
                      <Button variant="outline" className="w-full gap-2">
                        <ArrowRight className="h-4 w-4" />
                        Open Workspace
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

