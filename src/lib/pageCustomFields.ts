/** Mirrors PHP {@link FluxPage::SEPARATOR_CUSTOM_FIELDS}. */
export const PAGE_CUSTOM_FIELDS_SEPARATOR = '-|'

/** Convert wire `customFields` to one value per line for the editor textarea. */
export function customFieldsWireToLines(customFields: string | null | undefined): string {
  if (!customFields?.trim()) return ''
  return customFields.split(PAGE_CUSTOM_FIELDS_SEPARATOR).join('\n')
}

/** Convert textarea lines to wire `customFields`; empty input clears the field. */
export function customFieldsLinesToWire(linesText: string): string | undefined {
  const lines = linesText
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return undefined
  return lines.join(PAGE_CUSTOM_FIELDS_SEPARATOR)
}
