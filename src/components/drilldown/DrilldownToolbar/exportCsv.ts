import { api } from '@/api/client'
import type { CsvExportResponse, DrilldownRequest } from '@/types/stats'
import type { DrilldownExportRequest } from '@/components/drilldown/DrilldownToolbar/types'

export function buildDrilldownExportRequest(
  request: DrilldownRequest,
  dateFrom: Date,
  dateTo: Date,
): DrilldownExportRequest {
  return {
    ...request,
    timeStart: Math.floor(dateFrom.getTime() / 1000),
    timeEnd: Math.floor(dateTo.getTime() / 1000),
  }
}

export async function downloadDrilldownCsv(
  exportRequest: DrilldownExportRequest,
  filename: string,
): Promise<void> {
  const response = await api.post<CsvExportResponse>('/stats/reporting/export/csv/', {
    drilldownRequest: exportRequest,
    filename,
    addHeader: true,
  })

  if (!response.url) {
    throw new Error('CSV export did not return a download URL')
  }

  const link = document.createElement('a')
  link.href = response.url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}
