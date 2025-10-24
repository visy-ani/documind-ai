'use client'

import { useMemo } from 'react'
import { calculatePasswordStrength } from '@/lib/validations/auth'

interface PasswordStrengthProps {
  password: string
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(
    () => calculatePasswordStrength(password),
    [password]
  )

  if (!password) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength:</span>
        <span
          className={`font-medium ${
            strength.label === 'Weak'
              ? 'text-red-500'
              : strength.label === 'Medium'
              ? 'text-yellow-500'
              : 'text-green-500'
          }`}
        >
          {strength.label}
        </span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              level <= strength.score ? strength.color : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground">
        <li className={password.length >= 8 ? 'text-green-600' : ''}>
          {password.length >= 8 ? '✓' : '○'} At least 8 characters
        </li>
        <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
          {/[a-z]/.test(password) ? '✓' : '○'} One lowercase letter
        </li>
        <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
          {/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter
        </li>
        <li className={/\d/.test(password) ? 'text-green-600' : ''}>
          {/\d/.test(password) ? '✓' : '○'} One number
        </li>
      </ul>
    </div>
  )
}

