import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { Button, Input, Modal, Select } from '@/components/ui-kit'

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  fieldOptions: Array<{ value: string; label: string }>
  onImport: (rows: Record<string, string>[]) => Promise<void>
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const parseLine = (line: string) =>
    line.split(',').map((value) => value.trim().replace(/^"|"$/g, ''))

  return {
    headers: parseLine(lines[0]),
    rows: lines.slice(1).map(parseLine),
  }
}

export function CsvImportDialog({
  open,
  onOpenChange,
  title,
  description,
  fieldOptions,
  onImport,
}: CsvImportDialogProps) {
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [isImporting, setIsImporting] = useState(false)

  const previewRows = useMemo(() => rows.slice(0, 5), [rows])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const text = await file.text()
    const parsed = parseCsv(text)
    setHeaders(parsed.headers)
    setRows(parsed.rows)
    setMappings(
      Object.fromEntries(
        parsed.headers.map((header) => {
          const match = fieldOptions.find((option) => option.value.toLowerCase() === header.toLowerCase())
          return [header, match?.value ?? '__skip__']
        }),
      ),
    )
  }

  const handleImport = async () => {
    const mappedRows = rows.map((row) =>
      Object.fromEntries(
        row.flatMap((value, index) => {
          const header = headers[index]
          const mappedField = mappings[header]
          return mappedField && mappedField !== '__skip__' ? [[mappedField, value]] : []
        }),
      ),
    )

    setIsImporting(true)
    try {
      await onImport(mappedRows)
      onOpenChange(false)
      setHeaders([])
      setRows([])
      setMappings({})
    } finally {
      setIsImporting(false)
    }
  }

  const footer = (
    <div className="flex justify-end gap-2">
      <Button htmlType="button" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button type="primary" htmlType="button" disabled={rows.length === 0 || isImporting} onClick={() => void handleImport()}>
        {isImporting ? (
          <Icon name="loader-2" className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icon name="upload" className="mr-2 h-4 w-4" />
        )}
        Import
      </Button>
    </div>
  )

  return (
    <Modal open={open} onCancel={() => onOpenChange(false)} title={title} footer={footer} width={896} destroyOnHidden>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>

      <div className="space-y-4">
        <div className="rounded-lg border border-dashed p-6">
          <label htmlFor="csv-upload" className="mb-2 block text-sm font-medium">
            CSV file
          </label>
          <Input id="csv-upload" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
        </div>

        {headers.length > 0 ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              {headers.map((header) => (
                <div key={header} className="space-y-1.5">
                  <label className="text-sm font-medium">{header}</label>
                  <Select
                    value={mappings[header] ?? '__skip__'}
                    onChange={(value) =>
                      setMappings((current) => ({ ...current, [header]: value }))
                    }
                    className="w-full"
                    options={[
                      { value: '__skip__', label: 'Skip column' },
                      ...fieldOptions.map((option) => ({
                        value: option.value,
                        label: option.label,
                      })),
                    ]}
                  />
                </div>
              ))}
            </div>

            <div className="rounded-md border overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {headers.map((header) => (
                      <th key={header} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b">
                      {headers.map((header, index) => (
                        <td key={`${header}-${rowIndex}`} className="px-3 py-2">
                          {row[index] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  )
}
