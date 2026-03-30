import { useMemo, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-dashed p-6">
            <Label htmlFor="csv-upload" className="mb-2 block text-sm font-medium">
              CSV file
            </Label>
            <Input id="csv-upload" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
          </div>

          {headers.length > 0 ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {headers.map((header) => (
                  <div key={header} className="space-y-1.5">
                    <Label>{header}</Label>
                    <Select
                      value={mappings[header] ?? '__skip__'}
                      onValueChange={(value) =>
                        setMappings((current) => ({ ...current, [header]: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__skip__">Skip column</SelectItem>
                        {fieldOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={rows.length === 0 || isImporting} onClick={() => void handleImport()}>
              {isImporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Import
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
