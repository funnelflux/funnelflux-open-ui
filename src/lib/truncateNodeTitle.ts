/** Prevent funnel node cards from growing with extremely long names. */
export function truncateNodeTitle(title: string, maxLength = 48): string {
  const trimmed = title.trim()
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength)}…`
}
