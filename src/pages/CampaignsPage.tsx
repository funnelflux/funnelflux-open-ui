import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { IdName } from '@/types/api'

export function CampaignsPage() {
  const { data: campaigns, isLoading, error } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get<IdName[]>('/data/campaign/list/'),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Campaigns</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
          Add Campaign
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {isLoading && (
          <div className="p-6 text-center text-slate-500">Loading campaigns...</div>
        )}
        {error && (
          <div className="p-6 text-center text-red-500">
            Failed to load campaigns: {(error as Error).message}
          </div>
        )}
        {campaigns && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-48">ID</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{c.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {campaigns && (
          <div className="px-4 py-3 text-sm text-slate-500 border-t border-slate-200">
            {campaigns.length} campaigns
          </div>
        )}
      </div>
    </div>
  )
}
