import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CRISP_IDENTITY_STORAGE_KEY } from '@/lib/crisp'
import type { SupportChatConfig } from '@/schemas/apiBoundaries'

vi.mock('@/api/client', () => ({
  api: { get: vi.fn() },
}))

const CRISP_SRC = 'https://client.crisp.chat/l.js'

const config: SupportChatConfig = {
  websiteId: 'site-123',
  email: 'user@example.com',
  nickname: 'Zeno Rocha',
  sessionData: {
    user_hash: 'abc',
    is_admin: 'yes',
    funnelflux_version: '3.003',
  },
}

// Dynamic imports after resetModules: the Crisp loader keeps the applied identity at module
// scope, so each test (and each simulated page load) needs a fresh module instance.
async function setup() {
  vi.resetModules()
  const { api } = await import('@/api/client')
  const { useSupportChat } = await import('@/api/hooks/useSupportChat')
  const { openCrispChat } = await import('@/lib/crisp')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const queryFailed = () =>
    waitFor(() => expect(client.getQueryCache().getAll()[0]?.state.status).toBe('error'))
  vi.mocked(api.get).mockReset()
  return { api: vi.mocked(api), useSupportChat, openCrispChat, wrapper, queryFailed }
}

/** Simulate a full page load: fresh modules and no in-page Crisp, but browser storage kept. */
function newPage() {
  delete window.$crisp
  delete window.CRISP_WEBSITE_ID
  crispScripts().forEach((s) => s.remove())
}

async function loadAs(response: SupportChatConfig, userId = '7') {
  const ctx = await setup()
  ctx.api.get.mockResolvedValue(response)
  const hook = renderHook(() => ctx.useSupportChat(userId), { wrapper: ctx.wrapper })
  await waitFor(() => expect(hook.result.current).toBe(true))
  return { ...ctx, hook }
}

function crispScripts() {
  return document.head.querySelectorAll(`script[src="${CRISP_SRC}"]`)
}

function handler(event: string) {
  const entry = window.$crisp!.find((c) => c[0] === 'on' && c[1] === event)
  expect(entry).toBeDefined()
  return entry![2] as () => void
}

const hideCount = () => window.$crisp!.filter((c) => c[1] === 'chat:hide').length
const resetCount = () => window.$crisp!.filter((c) => c[1] === 'session:reset').length

describe('useSupportChat', () => {
  beforeEach(() => {
    // Advancing fake timers keep waitFor working while letting tests drop pending Crisp timers.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    window.localStorage.clear()
    newPage()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('loads Crisp with the API website ID, identity, and session data in key order', async () => {
    const { api } = await loadAs(config)

    expect(api.get).toHaveBeenCalledWith('/ui/support/chat/load/')
    expect(window.CRISP_WEBSITE_ID).toBe('site-123')
    const scripts = crispScripts()
    expect(scripts).toHaveLength(1)
    expect((scripts[0] as HTMLScriptElement).crossOrigin).toBe('anonymous')

    expect(window.$crisp!.filter((c) => c[0] === 'set')).toEqual([
      ['set', 'user:email', ['user@example.com']],
      ['set', 'session:identifier', 'user@example.com'],
      ['set', 'user:nickname', ['Zeno Rocha']],
      [
        'set',
        'session:data',
        [[['user_hash', 'abc'], ['is_admin', 'yes'], ['funnelflux_version', '3.003']]],
      ],
    ])
    expect(resetCount()).toBe(0)
  })

  it('hides the Crisp launcher on session load, after the fallback delay, and on chat close', async () => {
    await loadAs(config)

    handler('session:loaded')()
    expect(hideCount()).toBe(1)
    vi.advanceTimersByTime(2500)
    expect(hideCount()).toBe(2)
    // Crisp may still report the chat as opened while its close event runs.
    window.$crisp!.is = (state) => state === 'chat:opened'
    handler('chat:closed')()
    expect(hideCount()).toBe(3)
  })

  it('does not hide the chat while the user has it open', async () => {
    await loadAs(config)
    window.$crisp!.is = (state) => state === 'chat:opened'

    vi.advanceTimersByTime(2500)
    handler('session:loaded')()

    expect(hideCount()).toBe(0)
  })

  it('skips the nickname when empty and session data when no keys are present', async () => {
    await loadAs({ ...config, nickname: '', sessionData: {} })

    expect(window.$crisp!.filter((c) => c[0] === 'set').map((c) => c[1])).toEqual([
      'user:email',
      'session:identifier',
    ])
  })

  it('does not load Crisp and hides the button when the endpoint errors', async () => {
    const { api, useSupportChat, wrapper, queryFailed } = await setup()
    api.get.mockRejectedValue(new Error('Not Found'))

    const { result } = renderHook(() => useSupportChat('7'), { wrapper })

    await queryFailed()
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(result.current).toBe(false)
    expect(window.$crisp).toBeUndefined()
    expect(crispScripts()).toHaveLength(0)
  })

  it('does not load Crisp when the response lacks a website ID', async () => {
    const { api, useSupportChat, wrapper, queryFailed } = await setup()
    api.get.mockResolvedValue({ ...config, websiteId: '' })

    const { result } = renderHook(() => useSupportChat('7'), { wrapper })

    await queryFailed()
    expect(result.current).toBe(false)
    expect(crispScripts()).toHaveLength(0)
  })

  it('resets the Crisp session when a different user signs in without a reload', async () => {
    const first = await loadAs(config)
    first.hook.unmount()

    first.api.get.mockResolvedValue({ ...config, email: 'other@example.com', nickname: '' })
    const second = renderHook(() => first.useSupportChat('8'), { wrapper: first.wrapper })
    await waitFor(() => expect(second.result.current).toBe(true))

    expect(crispScripts()).toHaveLength(1)
    const tail = window.$crisp!.slice(window.$crisp!.findIndex((c) => c[1] === 'session:reset'))
    expect(tail.slice(0, 3)).toEqual([
      ['do', 'session:reset'],
      ['set', 'user:email', ['other@example.com']],
      ['set', 'session:identifier', 'other@example.com'],
    ])
  })

  it('resets the restored Crisp session when a different user signs in after a page load', async () => {
    const first = await loadAs(config)
    first.hook.unmount()
    newPage()

    await loadAs({ ...config, email: 'other@example.com' })

    expect(resetCount()).toBe(1)
    expect(window.localStorage.getItem(CRISP_IDENTITY_STORAGE_KEY)).toBe('other@example.com')
  })

  it('keeps the Crisp session when the same user reloads the page', async () => {
    const first = await loadAs(config)
    first.hook.unmount()
    newPage()

    await loadAs(config)

    expect(resetCount()).toBe(0)
  })

  it('opens the chat by showing the widget then opening it', async () => {
    const { openCrispChat } = await loadAs(config)

    openCrispChat()

    expect(window.$crisp!.slice(-2)).toEqual([
      ['do', 'chat:show'],
      ['do', 'chat:open'],
    ])
  })
})
