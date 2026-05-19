import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  help?: string
  children: ReactNode
  className?: string
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  help,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn(className)}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
      {!error && help && <p className="mt-2 text-xs text-muted-foreground">{help}</p>}
    </div>
  )
}
