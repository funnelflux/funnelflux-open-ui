import { describe, it, expect, vi } from 'vitest'
import { bulkMutate } from './bulkActions'

describe('bulkMutate', () => {
  it('processes all IDs successfully', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    const result = await bulkMutate(['1', '2', '3'], mutateAsync)
    expect(result.succeeded).toEqual(['1', '2', '3'])
    expect(result.failed).toHaveLength(0)
  })

  it('collects failures', async () => {
    const error = new Error('fail')
    const mutateAsync = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined)
    const result = await bulkMutate(['1', '2', '3'], mutateAsync, 3)
    expect(result.succeeded).toEqual(['1', '3'])
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].id).toBe('2')
  })

  it('respects concurrency limit', async () => {
    let concurrent = 0
    let maxConcurrent = 0
    const mutateAsync = vi.fn().mockImplementation(async () => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await new Promise(r => setTimeout(r, 10))
      concurrent--
    })
    await bulkMutate(['1', '2', '3', '4', '5', '6'], mutateAsync, 2)
    expect(maxConcurrent).toBeLessThanOrEqual(2)
  })
})
