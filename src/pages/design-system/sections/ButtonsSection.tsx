import { Button, Space } from '@/components/ui-kit'
import { Icon } from '@/components/ui-kit/icons'

export function ButtonsSection() {
  return (
    <section id="buttons">
      <h2 className="text-xl font-semibold text-foreground mb-6">Buttons</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Import: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{'import { Button } from "@/components/ui-kit"'}</code>
      </p>

      <div className="space-y-8">
        {/* Types */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Types</h3>
          <Space wrap>
            <Button type="primary">Primary</Button>
            <Button>Default</Button>
            <Button type="dashed">Dashed</Button>
            <Button type="text">Text</Button>
            <Button type="link">Link</Button>
            <Button uiVariant="accent">Accent</Button>
          </Space>
        </div>

        {/* Danger */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Danger</h3>
          <Space wrap>
            <Button type="primary" danger>Delete</Button>
            <Button danger>Danger Default</Button>
            <Button type="text" danger>Danger Text</Button>
          </Space>
        </div>

        {/* Sizes */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Sizes</h3>
          <Space wrap align="center">
            <Button type="primary" size="small">Small (28px)</Button>
            <Button type="primary">Default (36px)</Button>
            <Button type="primary" size="large">Large (44px)</Button>
          </Space>
        </div>

        {/* With Icons */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">With Icons</h3>
          <Space wrap>
            <Button type="primary" icon={<Icon name="plus" size="sm" />}>Create</Button>
            <Button icon={<Icon name="download" size="sm" />}>Export</Button>
            <Button type="text" danger icon={<Icon name="trash-2" size="sm" />} />
          </Space>
        </div>

        {/* States */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">States</h3>
          <Space wrap>
            <Button type="primary" loading>Loading</Button>
            <Button type="primary" disabled>Disabled</Button>
            <Button disabled>Disabled Default</Button>
          </Space>
        </div>

        {/* Anti-patterns */}
        <div className="p-4 bg-muted rounded-lg border border-border">
          <h3 className="text-sm font-medium text-error mb-2">Anti-patterns</h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Don't use <code>ghost</code> type (use <code>type="text"</code> instead)</li>
            <li>Don't add box-shadow to buttons (disabled in theme)</li>
            <li>Don't mix shadcn Button with antd Button in the same view</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
