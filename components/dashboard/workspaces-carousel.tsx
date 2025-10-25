'use client'

import { motion } from 'framer-motion'
import { Folder, Users, UserPlus, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import Link from 'next/link'

interface WorkspaceMember {
  id: string
  name: string
  avatarUrl?: string
}

interface Workspace {
  id: string
  name: string
  memberCount: number
  members: WorkspaceMember[]
  isActive: boolean
}

interface WorkspacesCarouselProps {
  workspaces: Workspace[]
  isEmpty?: boolean
}

export function WorkspacesCarousel({ workspaces, isEmpty = false }: WorkspacesCarouselProps) {
  if (isEmpty || workspaces.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Workspaces</CardTitle>
            <CardDescription>Collaborate with your teams</CardDescription>
          </div>
          <Link href="/workspaces">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4">
            {workspaces.map((workspace, index) => (
              <motion.div
                key={workspace.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="min-w-[280px]"
              >
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <Folder className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{workspace.name}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {workspace.memberCount} members
                            </p>
                          </div>
                        </div>
                        {workspace.isActive && (
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                        )}
                      </div>

                      <div className="flex items-center -space-x-2">
                        {workspace.members.slice(0, 4).map((member) => (
                          <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={member.avatarUrl} alt={member.name} />
                            <AvatarFallback className="text-xs">
                              {member.name[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {workspace.memberCount > 4 && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                            +{workspace.memberCount - 4}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/workspaces/${workspace.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Open
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm">
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

