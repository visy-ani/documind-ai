'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, Upload, X, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface OnboardingStep {
  id: string
  label: string
  description: string
  completed: boolean
  action?: {
    label: string
    href: string
  }
}

interface OnboardingWidgetProps {
  hasDocuments: boolean
  hasQueries: boolean
  hasWorkspaces: boolean
}

export function OnboardingWidget({ 
  hasDocuments, 
  hasQueries, 
  hasWorkspaces 
}: OnboardingWidgetProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onboarding-dismissed') === 'true'
    }
    return false
  })

  // Show widget only for first-time users or users who haven't completed all steps
  const isVisible = !hasDocuments || !hasQueries

  const steps: OnboardingStep[] = [
    {
      id: 'auth',
      label: 'Create your account',
      description: 'Successfully signed up and logged in',
      completed: true, // Always true if they can see this
    },
    {
      id: 'upload',
      label: 'Upload your first document',
      description: 'Add a PDF, Word, or Excel file',
      completed: hasDocuments,
      action: {
        label: 'Upload Now',
        href: '/dashboard/upload',
      },
    },
    {
      id: 'analyze',
      label: 'Analyze with AI',
      description: 'Ask questions about your documents',
      completed: hasQueries,
      action: {
        label: 'Try AI Analysis',
        href: '/documents',
      },
    },
    {
      id: 'collaborate',
      label: 'Invite team members',
      description: 'Collaborate on documents together',
      completed: hasWorkspaces,
      action: {
        label: 'Create Workspace',
        href: '/workspaces',
      },
    },
  ]

  const completedSteps = steps.filter((step) => step.completed).length
  const progress = (completedSteps / steps.length) * 100
  const nextStep = steps.find((step) => !step.completed)

  const handleDismiss = () => {
    localStorage.setItem('onboarding-dismissed', 'true')
    setIsDismissed(true)
  }

  if (isDismissed || !isVisible) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="relative">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Welcome to DocuMind AI!
                </CardTitle>
                <CardDescription>
                  Complete these steps to get the most out of your experience
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleDismiss}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {completedSteps} of {steps.length} completed
                </span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={cn(
                  'flex items-start gap-3 rounded-lg p-3 transition-colors',
                  step.completed
                    ? 'bg-green-50 dark:bg-green-950/20'
                    : 'bg-muted/50 hover:bg-muted'
                )}
              >
                <div className="pt-0.5">
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <p className={cn(
                    'text-sm font-medium',
                    step.completed && 'text-green-700 dark:text-green-300'
                  )}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                {!step.completed && step.action && (
                  <Link href={step.action.href}>
                    <Button size="sm" variant="outline">
                      {step.action.label}
                    </Button>
                  </Link>
                )}
              </motion.div>
            ))}

            {nextStep && (
              <div className="pt-3 border-t">
                <Link href={nextStep.action?.href || '/dashboard/upload'}>
                  <Button className="w-full" size="lg">
                    <Upload className="mr-2 h-4 w-4" />
                    {nextStep.action?.label || 'Get Started'}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

