import { Icon } from '@/components/ui-kit/icons'

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <span className="text-muted-foreground [&>svg]:h-8 [&>svg]:w-8">
        <Icon name="loader-2" size="lg" animation="spin" />
      </span>
    </div>
  )
}
