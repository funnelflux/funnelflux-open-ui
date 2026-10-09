import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui-kit/icons'

interface LoadingPageProps {
  className?: string
}

export function LoadingPage({ className }: LoadingPageProps) {
  return (
    <div className={cn('flex min-h-[400px] items-center justify-center', className)}>
      <span className="text-muted-foreground [&>svg]:h-8 [&>svg]:w-8">
        <Icon name="loader-2" size="lg" animation="spin" />
      </span>
    </div>
  )
}
