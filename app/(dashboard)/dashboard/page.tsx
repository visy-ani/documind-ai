'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { user, isLoading, signOut } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to DocuMind AI</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium">Name:</span>
                <p className="text-muted-foreground">{user?.name || 'Not set'}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Email:</span>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Plan:</span>
                <p className="text-muted-foreground capitalize">{user?.usageTier}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with these features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/upload">
                <Button className="w-full" variant="default">
                  Upload Document
                </Button>
              </Link>
              <Link href="/documents">
                <Button className="w-full" variant="outline">
                  View Documents
                </Button>
              </Link>
              <Button className="w-full" variant="outline">
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>🎉 Authentication System Complete!</CardTitle>
            <CardDescription>All auth features are working</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>✅ Email/Password Authentication</p>
              <p>✅ Google OAuth Integration</p>
              <p>✅ Password Reset Flow</p>
              <p>✅ Protected Routes with Middleware</p>
              <p>✅ Session Management</p>
              <p>✅ User Context & Hooks</p>
              <p className="mt-4 text-muted-foreground">
                You&apos;re now ready to build the rest of your DocuMind AI features!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

