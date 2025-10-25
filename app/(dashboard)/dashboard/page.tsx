'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/components/auth/auth-provider'
import { Loader2 } from 'lucide-react'

// Dashboard Components
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { Overview } from '@/components/dashboard/overview'
import { RecentDocuments } from '@/components/dashboard/recent-documents'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { WorkspacesCarousel } from '@/components/dashboard/workspaces-carousel'
import { OnboardingWidget } from '@/components/dashboard/onboarding-widget'
import { EmptyState } from '@/components/dashboard/empty-state'

interface DashboardData {
  stats: {
    documents: number
    queries: number
    storage: string
    members: number
  }
  documents: Array<{
    id: string
    name: string
    type: string
    createdAt: Date
    status: 'ready' | 'processing' | 'error'
  }>
  activities: Array<{
    id: string
    type: 'query' | 'upload' | 'summary' | 'extract'
    documentName: string
    query?: string
    userName: string
    userAvatar?: string
    timestamp: Date
  }>
  workspaces: Array<{
    id: string
    name: string
    memberCount: number
    members: Array<{
      id: string
      name: string
      avatarUrl?: string
    }>
    isActive: boolean
  }>
  isEmpty: boolean
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    stats: {
      documents: 0,
      queries: 0,
      storage: '0 MB',
      members: 1,
    },
    documents: [],
    activities: [],
    workspaces: [],
    isEmpty: true,
  })

  useEffect(() => {
    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        // Fetch all dashboard data in parallel
        const [statsRes, activitiesRes, workspacesRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/activities?limit=6'),
          fetch('/api/dashboard/workspaces'),
        ])

        if (!statsRes.ok) {
          throw new Error('Failed to fetch dashboard stats')
        }

        const [statsData, activitiesData, workspacesData] = await Promise.all([
          statsRes.json(),
          activitiesRes.ok ? activitiesRes.json() : { success: false, activities: [] },
          workspacesRes.ok ? workspacesRes.json() : { success: false, workspaces: [] },
        ])

        if (statsData.success) {
          setDashboardData({
            stats: statsData.stats,
            documents: statsData.documents || [],
            activities: activitiesData.success ? activitiesData.activities : [],
            workspaces: workspacesData.success ? workspacesData.workspaces : [],
            isEmpty: statsData.isEmpty,
          })
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      }
    }

    // Fetch data on mount
    fetchDashboardData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const hasDocuments = dashboardData.documents.length > 0
  const hasQueries = dashboardData.activities.some((a) => a.type === 'query')
  const hasWorkspaces = dashboardData.workspaces.length > 0

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Sidebar - Desktop Only */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 space-y-6">
            {/* Welcome Section */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {user?.name || 'there'}!
              </h1>
              <p className="text-muted-foreground">
                Here&apos;s what&apos;s happening with your documents today.
              </p>
            </motion.div>

            {/* Onboarding Widget - Shows for new users */}
            <OnboardingWidget
              hasDocuments={hasDocuments}
              hasQueries={hasQueries}
              hasWorkspaces={hasWorkspaces}
            />

            {/* Quick Stats Overview */}
            <Overview stats={dashboardData.stats} />

            {/* Main Content Grid */}
            {dashboardData.isEmpty ? (
              <EmptyState />
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column - Takes 2 columns on large screens */}
                <div className="space-y-6 lg:col-span-2">
                  {/* Recent Documents */}
                  <RecentDocuments
                    documents={dashboardData.documents}
                    isEmpty={!hasDocuments}
                  />

                  {/* Workspaces Carousel */}
                  {hasWorkspaces && (
                    <WorkspacesCarousel
                      workspaces={dashboardData.workspaces}
                      isEmpty={!hasWorkspaces}
                    />
                  )}
                </div>

                {/* Right Column - Activity Feed */}
                <div className="lg:col-span-1">
                  <ActivityFeed
                    activities={dashboardData.activities}
                    isEmpty={dashboardData.activities.length === 0}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
