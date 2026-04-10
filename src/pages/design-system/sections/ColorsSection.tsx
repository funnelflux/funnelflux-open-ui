const palette = [
  { label: 'Gray 0', var: '--ff-gray-0', hex: '#FFFFFF' },
  { label: 'Gray 50', var: '--ff-gray-50', hex: '#F8FAFC' },
  { label: 'Gray 100', var: '--ff-gray-100', hex: '#F1F5F9' },
  { label: 'Gray 200', var: '--ff-gray-200', hex: '#E2E8F0' },
  { label: 'Gray 300', var: '--ff-gray-300', hex: '#CBD5E1' },
  { label: 'Gray 400', var: '--ff-gray-400', hex: '#94A3B8' },
  { label: 'Gray 500', var: '--ff-gray-500', hex: '#64748B' },
  { label: 'Gray 600', var: '--ff-gray-600', hex: '#475569' },
  { label: 'Gray 700', var: '--ff-gray-700', hex: '#334155' },
  { label: 'Gray 800', var: '--ff-gray-800', hex: '#1E293B' },
  { label: 'Gray 900', var: '--ff-gray-900', hex: '#0F172A' },
  { label: 'Gray 950', var: '--ff-gray-950', hex: '#020617' },
]

const bluePalette = [
  { label: 'Blue 50', var: '--ff-blue-50', hex: '#EFF6FF' },
  { label: 'Blue 100', var: '--ff-blue-100', hex: '#DBEAFE' },
  { label: 'Blue 500', var: '--ff-blue-500', hex: '#3B82F6' },
  { label: 'Blue 600', var: '--ff-blue-600', hex: '#2563EB' },
  { label: 'Blue 700', var: '--ff-blue-700', hex: '#1D4ED8' },
]

const semanticColors = [
  { label: 'Success', var: '--ff-success', hex: '#16A34A' },
  { label: 'Warning', var: '--ff-warning', hex: '#D97706' },
  { label: 'Error', var: '--ff-error', hex: '#DC2626' },
  { label: 'Info', var: '--ff-info', hex: '#3B82F6' },
]

const chartColors = [
  '#3B82F6', '#8B5CF6', '#06B6D4', '#F97316', '#22C55E',
  '#EC4899', '#EAB308', '#6366F1', '#14B8A6', '#F43F5E',
]

function Swatch({ label, cssVar, hex }: { label: string; cssVar: string; hex: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-16 h-16 rounded-lg border border-border"
        style={{ backgroundColor: hex }}
      />
      <span className="text-xs font-medium text-foreground">{label}</span>
      <span className="text-[10px] text-muted-foreground font-mono">{hex}</span>
      <span className="text-[10px] text-muted-foreground font-mono">{cssVar}</span>
    </div>
  )
}

export function ColorsSection() {
  return (
    <section id="colors">
      <h2 className="text-xl font-semibold text-foreground mb-6">Colors</h2>

      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Neutral (Slate)</h3>
      <div className="flex flex-wrap gap-4 mb-8">
        {palette.map((c) => (
          <Swatch key={c.var} label={c.label} cssVar={c.var} hex={c.hex} />
        ))}
      </div>

      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Primary (Blue)</h3>
      <div className="flex flex-wrap gap-4 mb-8">
        {bluePalette.map((c) => (
          <Swatch key={c.var} label={c.label} cssVar={c.var} hex={c.hex} />
        ))}
      </div>

      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Semantic</h3>
      <div className="flex flex-wrap gap-4 mb-8">
        {semanticColors.map((c) => (
          <Swatch key={c.var} label={c.label} cssVar={c.var} hex={c.hex} />
        ))}
      </div>

      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Chart Palette</h3>
      <div className="flex flex-wrap gap-3">
        {chartColors.map((hex, i) => (
          <div key={hex} className="flex flex-col items-center gap-1.5">
            <div
              className="w-12 h-12 rounded-lg"
              style={{ backgroundColor: hex }}
            />
            <span className="text-[10px] text-muted-foreground font-mono">{i + 1}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{hex}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
