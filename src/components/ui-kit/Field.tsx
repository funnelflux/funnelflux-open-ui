import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FieldProps {
  title: string
  htmlFor?: string
  required?: boolean
  description?: string
  errorText?: string
  children: ReactNode
  className?: string
}

export function Field({
  title,
  htmlFor,
  required,
  description,
  errorText,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {title}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
      {errorText ? (
        <p className="text-xs text-error">{errorText}</p>
      ) : description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

