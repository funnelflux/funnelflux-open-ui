const spacingScale = [
  { name: 'space-1', px: 4 },
  { name: 'space-2', px: 8 },
  { name: 'space-3', px: 12 },
  { name: 'space-4', px: 16 },
  { name: 'space-5', px: 20 },
  { name: 'space-6', px: 24 },
  { name: 'space-8', px: 32 },
  { name: 'space-10', px: 40 },
  { name: 'space-12', px: 48 },
  { name: 'space-16', px: 64 },
]

export function SpacingSection() {
  return (
    <section id="spacing">
      <h2 className="text-xl font-semibold text-foreground mb-6">Spacing</h2>
      <p className="text-sm text-muted-foreground mb-6">
        4px base unit. Use Tailwind utilities (p-1, p-2, gap-3, etc.) for layout.
      </p>

      <div className="space-y-3">
        {spacingScale.map((s) => (
          <div key={s.name} className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground font-mono w-24 shrink-0">
              --{s.name}
            </span>
            <span className="text-xs text-muted-foreground w-12 shrink-0">{s.px}px</span>
            <div
              className="h-4 rounded bg-primary"
              style={{ width: s.px }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
