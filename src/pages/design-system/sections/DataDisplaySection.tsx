import { Avatar, Badge, Card, Descriptions, Space, Tag, Tooltip } from '@/components/ui-kit'
import { EmptyState } from '@/components/ui-kit'
import { Icon } from '@/components/ui-kit/icons'

export function DataDisplaySection() {
  return (
    <section id="data-display">
      <h2 className="text-xl font-semibold text-foreground mb-6">Data Display</h2>

      <div className="space-y-8">
        {/* Cards */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Card</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Use sparingly for grouping related content. For data, prefer the shared DataTable.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-3xl">
            <Card className="ff-analytics-panel" title="Configuration" styles={{ body: { padding: 16 } }}>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><Tag color="green">Active</Tag></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Type</span><span>CPA</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Payout</span><span>$2.50</span></div>
              </div>
            </Card>
            <Card className="ff-analytics-panel" title="Tracking" styles={{ body: { padding: 16 } }}>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Visits</span><span>12,450</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Clicks</span><span>8,230</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Conv.</span><span>245</span></div>
              </div>
            </Card>
            <Card className="ff-analytics-panel" title="Revenue" styles={{ body: { padding: 16 } }}>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Revenue</span><span className="text-success">$4,900</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cost</span><span>$2,100</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Profit</span><span className="text-success font-medium">$2,800</span></div>
              </div>
            </Card>
          </div>
        </div>

        {/* Card variants */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Card Formats
          </h3>
          <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
            Canonical app panels use visible borders and structured headers. Do not add box
            shadows to chart, KPI, or dashboard cards.
          </p>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="overflow-hidden rounded-lg border border-border-strong bg-surface">
              <div className="border-b border-border-strong bg-surface-sunken px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Panel</span>
                  <Tag>Default</Tag>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div className="h-24 rounded border border-border bg-surface-sunken p-3">
                  <div className="mb-3 h-2 w-20 rounded bg-blue-500/70" />
                  <div className="flex h-14 items-end gap-2">
                    {[28, 42, 24, 56, 38, 64].map((h, i) => (
                      <span key={i} className="flex-1 rounded-sm bg-muted" style={{ height: h }} />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['Visits', 'Revenue', 'Cost', 'ROI'].map((label) => (
                    <div key={label} className="rounded border border-t-[3px] border-border-strong border-t-primary bg-surface px-3 py-2">
                      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
                      <div className="mt-1 text-base font-semibold text-foreground">12,450</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-border-strong bg-surface">
              <div className="border-b border-border-strong bg-surface-sunken px-4 py-3">
                <span className="text-sm font-semibold text-foreground">Metric Group</span>
              </div>
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['Visits', 'border-t-primary'],
                    ['Revenue', 'border-t-success'],
                    ['Cost', 'border-t-warning'],
                    ['ROI', 'border-t-primary'],
                  ].map(([label, topBorder]) => (
                    <div
                      key={label}
                      className={`rounded border border-t-[3px] border-border-strong ${topBorder} bg-surface px-3 py-2`}
                    >
                      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
                      <div className="mt-1 text-base font-semibold text-foreground">12,450</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the top accent for KPI cards, not tinted full-card backgrounds.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-border-strong bg-surface">
              <div className="border-b border-border-strong bg-surface-sunken px-4 py-3">
                <span className="text-sm font-semibold text-foreground">Inset Content</span>
              </div>
              <div className="space-y-3 p-4">
                <div className="rounded border border-border bg-surface-sunken p-3">
                  <div className="mb-2 text-[11px] font-medium text-muted-foreground">Table summary</div>
                  {['Rows loaded', 'Visible columns', 'Last refresh'].map((label, index) => (
                    <div
                      key={label}
                      className={`flex items-center justify-between py-1.5 text-sm ${index > 0 ? 'border-t border-border' : ''}`}
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground">{index === 0 ? '5,240' : index === 1 ? '18' : '14:32'}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Use sunken surfaces for inner wells, not for the parent card.
                </p>
              </div>
            </div>
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
                <Icon name="settings" size="sm" />
              </div>
            </Badge>
            <Badge count={0} showZero>
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <Icon name="settings" size="sm" />
              </div>
            </Badge>
            <Badge dot>
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <Icon name="settings" size="sm" />
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
            <Avatar icon={<Icon name="user" size="sm" />} />
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
