/** Parse comma-separated CSV with optional double-quoted fields (matches admin templates). */
export function parsePageCsvText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const parseLine = (line: string): string[] => {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = !inQuotes
        }
        continue
      }
      if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
        continue
      }
      current += char
    }
    values.push(current.trim())
    return values
  }

  return {
    headers: parseLine(lines[0]),
    rows: lines.slice(1).map(parseLine),
  }
}
