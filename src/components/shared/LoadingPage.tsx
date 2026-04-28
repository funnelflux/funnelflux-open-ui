import { Icon } from '@/components/ui-kit/icons'

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Icon name="loader-2" className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
