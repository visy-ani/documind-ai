'use client'

import { FileQuestion, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <FileQuestion className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl">404</CardTitle>
            <CardTitle className="text-2xl">Page Not Found</CardTitle>
            <CardDescription>
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Link href="/dashboard" className="w-full">
                <Button className="w-full gap-2">
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
            </div>

            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Popular pages:
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Link href="/documents">
                  <Button variant="ghost" size="sm">
                    Documents
                  </Button>
                </Link>
                <Link href="/workspaces">
                  <Button variant="ghost" size="sm">
                    Workspaces
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="ghost" size="sm">
                    Settings
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

