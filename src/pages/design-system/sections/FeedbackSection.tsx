import { Alert, Button, Progress, Skeleton, Space, App } from 'antd'

function ToastDemos() {
  const { message } = App.useApp()

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Toast (Snackbar)</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Single-line, floating top-center, auto-dismiss 2s, max stack 3. Uses antd <code className="bg-muted px-1.5 py-0.5 rounded">message</code> API.
        Import: <code className="bg-muted px-1.5 py-0.5 rounded">{'import { useToastApi } from "@/components/ui-kit"'}</code>
      </p>
      <Space wrap>
        <Button size="small" onClick={() => message.success({ content: 'Changes saved', duration: 2 })}>
          Success
        </Button>
        <Button size="small" onClick={() => message.error({ content: 'Failed to save', duration: 3 })}>
          Error
        </Button>
        <Button size="small" onClick={() => message.info({ content: 'Processing request', duration: 2 })}>
          Info
        </Button>
        <Button size="small" onClick={() => message.warning({ content: 'Rate limit approaching', duration: 2 })}>
          Warning
        </Button>
      </Space>
    </div>
  )
}

export function FeedbackSection() {
  return (
    <section id="feedback">
      <h2 className="text-xl font-semibold text-foreground mb-6">Feedback</h2>

      <div className="space-y-8 max-w-2xl">
        <ToastDemos />

        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Alerts</h3>
          <div className="space-y-3">
            <Alert title="Success" description="Operation completed successfully." type="success" showIcon />
            <Alert title="Info" description="Here is some helpful information." type="info" showIcon />
            <Alert title="Warning" description="Please review before continuing." type="warning" showIcon />
            <Alert title="Error" description="Something went wrong." type="error" showIcon />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Progress</h3>
          <div className="space-y-3">
            <Progress percent={72} />
            <Progress percent={100} />
            <Progress percent={45} status="exception" />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Skeleton</h3>
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      </div>
    </section>
  )
}
