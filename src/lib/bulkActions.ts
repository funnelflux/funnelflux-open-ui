export interface BulkResult {
  succeeded: string[]
  failed: Array<{ id: string; error: unknown }>
}

export async function bulkMutate(
  ids: string[],
  mutateAsync: (id: string) => Promise<unknown>,
  concurrency = 5,
): Promise<BulkResult> {
  const results: BulkResult = { succeeded: [], failed: [] }
  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = ids.slice(i, i + concurrency)
    const settled = await Promise.allSettled(
      batch.map(async (id) => {
        await mutateAsync(id)
        return id
      }),
    )
    for (let j = 0; j < settled.length; j++) {
      const result = settled[j]
      if (result.status === 'fulfilled') {
        results.succeeded.push(result.value)
      } else {
        results.failed.push({ id: batch[j], error: result.reason })
      }
    }
  }
  return results
}
