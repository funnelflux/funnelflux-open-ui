/** Admin-relative URLs for official CSV import templates (legacy MVC paths). */
export function pageCsvTemplateUrl(pageType: 'offer' | 'lander'): string {
  const path =
    pageType === 'offer'
      ? '/admin/templates/import-offers.csv'
      : '/admin/templates/import-landers.csv'
  return path
}

export type PageCsvImportResult = {
  success: boolean
  imported: number
  skipped: number
}

export function pageTypeToImportCsvType(pageType: 'offer' | 'lander'): '1' | '2' {
  return pageType === 'offer' ? '2' : '1'
}
