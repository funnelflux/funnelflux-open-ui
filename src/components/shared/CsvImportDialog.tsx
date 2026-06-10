import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { Button, Input, Modal } from '@/components/ui-kit'
import { parsePageCsvText } from '@/lib/parsePageCsv'

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Absolute or site-root path, e.g. `/admin/templates/import-offers.csv` */
  templateUrl: string
  onImport: (file: File) => Promise<void>
}

export function CsvImportDialog({
  open,
  onOpenChange,
  title,
  templateUrl,
  onImport,
}: CsvImportDialogProps) {
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const previewRows = useMemo(() => rows.slice(0, 5), [rows])

  const resetState = () => {
    setHeaders([])
    setRows([])
    setSelectedFile(null)
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const text = await file.text()
    const parsed = parsePageCsvText(text)
    setSelectedFile(file)
    setHeaders(parsed.headers)
    setRows(parsed.rows)
  }

  const handleImport = async () => {
    if (!selectedFile) {
      return
    }

    setIsImporting(true)
    try {
      await onImport(selectedFile)
      onOpenChange(false)
      resetState()
    } finally {
      setIsImporting(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    resetState()
  }

  const footer = (
    <div className="flex justify-end gap-2">
      <Button htmlType="button" onClick={handleCancel}>
        Cancel
      </Button>
      <Button
        type="primary"
        htmlType="button"
        disabled={!selectedFile || isImporting}
        onClick={() => void handleImport()}
      >
        {isImporting ? (
          <span className="mr-2 inline-flex">
            <Icon name="loader-2" size="md" animation="spin" />
          </span>
        ) : (
          <span className="mr-2 inline-flex">
            <Icon name="upload" size="md" />
          </span>
        )}
        Import
      </Button>
    </div>
  )

  return (
    <Modal open={open} onCancel={handleCancel} title={title} footer={footer} width={896} destroyOnHidden>
      <p className="text-sm text-muted-foreground mb-4">
        Download the{' '}
        <a href={templateUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          CSV template
        </a>
        , replace the sample rows with your data, then upload the file below. Columns must be comma-separated;
        values may be wrapped in double quotes. Rows with duplicate names or invalid URLs are skipped by the server.
      </p>

      <div className="space-y-4">
        <div className="rounded-lg border border-dashed p-6">
          <label htmlFor="csv-upload" className="mb-2 block text-sm font-medium">
            CSV file
          </label>
          <Input id="csv-upload" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
        </div>

        {headers.length > 0 ? (
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
            {rows.length > previewRows.length ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Showing first {previewRows.length} of {rows.length} data rows.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
