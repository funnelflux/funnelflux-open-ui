export function CachingSection() {
  return (
    <section id="caching">
      <h2 className="text-xl font-semibold text-foreground mb-6">Caching Patterns</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Data fetching uses <code className="bg-muted px-1.5 py-0.5 rounded text-xs">@tanstack/react-query</code>.
        These conventions ensure fast navigation and minimal API calls.
      </p>

      <div className="space-y-6 max-w-3xl">
        {/* Query Key Conventions */}
        <div className="p-4 bg-surface border border-border rounded-lg">
          <h3 className="text-sm font-medium text-foreground mb-3">Query Key Structure</h3>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{`// Entity lists
['traffic-sources']
['offers']
['landers']
['campaigns']

// Single entity
['traffic-sources', id]
['offers', id]

// Reports (include params for cache isolation)
['report', 'drilldown', { groupings, dateRange, filters }]
['report', 'quickview', { entityType, entityId, dateRange }]

// Settings / low-churn data
['settings', 'system']
['settings', 'tags']
['settings', 'conditions']`}</pre>
        </div>

        {/* Stale Times */}
        <div className="p-4 bg-surface border border-border rounded-lg">
          <h3 className="text-sm font-medium text-foreground mb-3">Stale Times (TTL)</h3>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Data Type</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">staleTime</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Rationale</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 text-foreground">Default (entity lists, most pages)</td>
                  <td className="py-2 pr-4 font-mono">Infinity</td>
                  <td className="py-2">
                    Global <code className="text-xs">QueryClient</code>: no background refetch on focus
                    or reconnect. Use Refresh / mutations / <code className="text-xs">invalidateQueries</code>.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 text-foreground">Default cache retention (gcTime)</td>
                  <td className="py-2 pr-4 font-mono">60m</td>
                  <td className="py-2">
                    Unused query data stays in memory for instant back-navigation between pages.
                    After 60 minutes unused, cache is garbage-collected and the next visit refetches.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 text-foreground">Entity table date keys</td>
                  <td className="py-2 pr-4 font-mono">API timeRange</td>
                  <td className="py-2">
                    Query keys use <code className="text-xs">toApiDateTimeRange</code> + shared session date/tz store — not raw
                    <code className="text-xs">Date.toISOString()</code>, so remounting a page does not bust the drilldown cache.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 text-foreground">Dashboard summary + top tables</td>
                  <td className="py-2 pr-4 font-mono">Infinity / 60m gc</td>
                  <td className="py-2">
                    Cached under <code className="text-xs">queryKeys.dashboard.*</code> with stable drilldown
                    request bodies. Date/tz live in the dashboard store for the session.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 text-foreground">Report data</td>
                  <td className="py-2 pr-4 font-mono">5m</td>
                  <td className="py-2">Expensive queries. Cache aggressively. Refresh button forces refetch.</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 text-foreground">Settings / tags</td>
                  <td className="py-2 pr-4 font-mono">10m</td>
                  <td className="py-2">Rarely changes. Cache long.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-foreground">User / permissions</td>
                  <td className="py-2 pr-4 font-mono">Infinity</td>
                  <td className="py-2">Never refetches. Set on login, cleared on logout.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Optimistic Updates */}
        <div className="p-4 bg-surface border border-border rounded-lg">
          <h3 className="text-sm font-medium text-foreground mb-3">Optimistic Updates (CRUD)</h3>
          <p className="text-xs text-muted-foreground mb-3">
            When a user creates, updates, or deletes an entity, update the cache directly instead of
            refetching the entire list. This keeps the UI instant.
          </p>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{`// After successful create:
queryClient.setQueryData(['offers'], (old) => [...old, newOffer])

// After successful update:
queryClient.setQueryData(['offers'], (old) =>
  old.map((o) => o.id === updated.id ? updated : o)
)

// After successful delete:
queryClient.setQueryData(['offers'], (old) =>
  old.filter((o) => o.id !== deletedId)
)

// Report refresh button:
queryClient.invalidateQueries({ queryKey: ['report'] })`}</pre>
        </div>

        {/* DataTable Integration */}
        <div className="p-4 bg-surface border border-border rounded-lg">
          <h3 className="text-sm font-medium text-foreground mb-3">DataTable + React Query</h3>
          <p className="text-xs text-muted-foreground mb-3">
            DataTable gets rows from React Query. When cache updates (optimistic or refetch),
            the table re-renders automatically.
          </p>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{`function OffersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['offers'],
    queryFn: api.offers.list,
    // Inherits global staleTime (Infinity) unless overridden
  })

  return (
    <DataTable
      data={data ?? []}
      loading={isLoading}
      columns={columns}
    />
  )
}

// Refresh button just invalidates the query:
<Button onClick={() => queryClient.invalidateQueries(['offers'])}>
  Refresh
</Button>`}</pre>
        </div>

        {/* Anti-patterns */}
        <div className="p-4 bg-muted rounded-lg border border-border">
          <h3 className="text-sm font-medium text-error mb-2">Anti-patterns</h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Don't set <code>staleTime: 0</code> -- it refetches on every mount/focus</li>
            <li>Don't call <code>refetch()</code> after mutations -- use <code>setQueryData</code> or <code>invalidateQueries</code></li>
            <li>Don't put report params in component state and pass to queryFn -- put them in the query key so cache isolates per-param-set</li>
            <li>Don't use <code>cacheTime: 0</code> (now <code>gcTime</code>) -- it destroys cache on unmount, killing back-nav speed</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
