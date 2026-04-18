import { Avatar, Badge, Card, Descriptions, Space, Tag, Tooltip } from '@/components/ui-kit'
import { UserOutlined, SettingOutlined } from '@ant-design/icons'
import { EmptyState } from '@/components/ui-kit'

export function DataDisplaySection() {
  return (
    <section id="data-display">
      <h2 className="text-xl font-semibold text-foreground mb-6">Data Display</h2>

      <div className="space-y-8">
        {/* Cards */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Card</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Use sparingly for grouping related content. For data, prefer AG-Grid tables.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-3xl">
            <Card title="Configuration" styles={{ body: { padding: 16 } }}>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><Tag color="green">Active</Tag></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Type</span><span>CPA</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Payout</span><span>$2.50</span></div>
              </div>
            </Card>
            <Card title="Tracking" styles={{ body: { padding: 16 } }}>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Visits</span><span>12,450</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Clicks</span><span>8,230</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Conv.</span><span>245</span></div>
              </div>
            </Card>
            <Card title="Revenue" styles={{ body: { padding: 16 } }}>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Revenue</span><span className="text-success">$4,900</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cost</span><span>$2,100</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Profit</span><span className="text-success font-medium">$2,800</span></div>
              </div>
            </Card>
          </div>
        </div>

        {/* Descriptions */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Descriptions</h3>
          <Descriptions bordered column={2} size="small" className="max-w-2xl">
            <Descriptions.Item label="Name">Campaign Alpha</Descriptions.Item>
            <Descriptions.Item label="Status">Active</Descriptions.Item>
            <Descriptions.Item label="Traffic Source">Facebook</Descriptions.Item>
            <Descriptions.Item label="Daily Budget">$150.00</Descriptions.Item>
          </Descriptions>
        </div>

        {/* Tags */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Tags</h3>
          <Space wrap>
            <Tag>Default</Tag>
            <Tag color="blue">Blue</Tag>
            <Tag color="green">Green</Tag>
            <Tag color="orange">Orange</Tag>
            <Tag color="red">Red</Tag>
            <Tag color="purple">Purple</Tag>
            <Tag variant="filled" color="processing">Processing</Tag>
            <Tag variant="filled" color="success">Success</Tag>
            <Tag variant="filled" color="error">Error</Tag>
            <Tag variant="filled" color="warning">Warning</Tag>
          </Space>
        </div>

        {/* Badge */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Badge</h3>
          <Space size="large">
            <Badge count={5}>
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <SettingOutlined />
              </div>
            </Badge>
            <Badge count={0} showZero>
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <SettingOutlined />
              </div>
            </Badge>
            <Badge dot>
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <SettingOutlined />
              </div>
            </Badge>
            <Badge status="success" text="Active" />
            <Badge status="error" text="Inactive" />
            <Badge status="processing" text="Processing" />
          </Space>
        </div>

        {/* Tooltip & Avatar */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Tooltips & Avatars</h3>
          <Space size="middle">
            <Tooltip title="This is a tooltip">
              <span className="text-sm underline decoration-dashed cursor-help">Hover me</span>
            </Tooltip>
            <Avatar icon={<UserOutlined />} />
            <Avatar style={{ backgroundColor: '#2563EB' }}>JD</Avatar>
            <Avatar.Group max={{ count: 3 }}>
              <Avatar style={{ backgroundColor: '#3B82F6' }}>A</Avatar>
              <Avatar style={{ backgroundColor: '#8B5CF6' }}>B</Avatar>
              <Avatar style={{ backgroundColor: '#06B6D4' }}>C</Avatar>
              <Avatar style={{ backgroundColor: '#F97316' }}>D</Avatar>
            </Avatar.Group>
          </Space>
        </div>

        {/* Empty State */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Empty State</h3>
          <div className="border border-border rounded-lg">
            <EmptyState
              message="No campaigns found"
              actionLabel="Create Campaign"
              onAction={() => {}}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
