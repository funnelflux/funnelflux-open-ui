import { Typography } from '@/components/ui-kit'

const { Title, Text, Paragraph } = Typography

export function TypographySection() {
  return (
    <section id="typography">
      <h2 className="text-xl font-semibold text-foreground mb-6">Typography</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Font: Inter. Ant Design Typography components for semantic text.
      </p>

      <div className="space-y-4">
        <div className="flex items-baseline gap-4 border-b border-border pb-3">
          <span className="text-xs text-muted-foreground w-20 shrink-0">H1 / 30px</span>
          <Title level={1} style={{ margin: 0 }}>Heading One</Title>
        </div>
        <div className="flex items-baseline gap-4 border-b border-border pb-3">
          <span className="text-xs text-muted-foreground w-20 shrink-0">H2 / 24px</span>
          <Title level={2} style={{ margin: 0 }}>Heading Two</Title>
        </div>
        <div className="flex items-baseline gap-4 border-b border-border pb-3">
          <span className="text-xs text-muted-foreground w-20 shrink-0">H3 / 20px</span>
          <Title level={3} style={{ margin: 0 }}>Heading Three</Title>
        </div>
        <div className="flex items-baseline gap-4 border-b border-border pb-3">
          <span className="text-xs text-muted-foreground w-20 shrink-0">H4 / 16px</span>
          <Title level={4} style={{ margin: 0 }}>Heading Four</Title>
        </div>
        <div className="flex items-baseline gap-4 border-b border-border pb-3">
          <span className="text-xs text-muted-foreground w-20 shrink-0">Body / 14px</span>
          <Paragraph style={{ margin: 0 }}>
            Body text. The quick brown fox jumps over the lazy dog.
          </Paragraph>
        </div>
        <div className="flex items-baseline gap-4 border-b border-border pb-3">
          <span className="text-xs text-muted-foreground w-20 shrink-0">Small / 12px</span>
          <Text style={{ fontSize: 12 }}>Small text for captions and labels</Text>
        </div>
        <div className="flex items-baseline gap-4 border-b border-border pb-3">
          <span className="text-xs text-muted-foreground w-20 shrink-0">Code</span>
          <Text code>console.log('hello')</Text>
        </div>
        <div className="flex items-baseline gap-4">
          <span className="text-xs text-muted-foreground w-20 shrink-0">Link</span>
          <Text>
            <a href="#typography" className="text-primary hover:text-primary-hover underline">
              Linked text
            </a>
          </Text>
        </div>
      </div>
    </section>
  )
}
