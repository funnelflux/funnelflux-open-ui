import { describe, expect, it } from 'vitest'
import {
  clampFixedPositionToViewport,
  computeSubmenuPlacement,
} from '@/lib/clampFixedPositionToViewport'

const viewport = { width: 1000, height: 800 }

describe('clampFixedPositionToViewport', () => {
  it('clamps overflow on the right and bottom edges', () => {
    const result = clampFixedPositionToViewport(
      { x: 900, y: 700 },
      { width: 200, height: 300 },
      { viewport, margin: 8 },
    )
    expect(result).toEqual({ x: 792, y: 492 })
  })

  it('clamps overflow on the left and top edges', () => {
    const result = clampFixedPositionToViewport(
      { x: 0, y: 0 },
      { width: 200, height: 100 },
      { viewport, margin: 8 },
    )
    expect(result).toEqual({ x: 8, y: 8 })
  })

  it('keeps in-range anchors unchanged', () => {
    const anchor = { x: 120, y: 160 }
    expect(
      clampFixedPositionToViewport(anchor, { width: 180, height: 220 }, { viewport, margin: 8 }),
    ).toEqual(anchor)
  })
})

describe('computeSubmenuPlacement', () => {
  it('opens to the right when there is room', () => {
    const placement = computeSubmenuPlacement(
      new DOMRect(100, 100, 180, 32),
      { width: 160, height: 120 },
      { viewport, margin: 8 },
    )
    expect(placement.horizontal).toBe('end')
    expect(placement.top).toBe(0)
  })

  it('flips to the left when the submenu would overflow right', () => {
    const placement = computeSubmenuPlacement(
      new DOMRect(860, 100, 180, 32),
      { width: 160, height: 120 },
      { viewport, margin: 8 },
    )
    expect(placement.horizontal).toBe('start')
  })

  it('shifts upward when the submenu would overflow bottom', () => {
    const placement = computeSubmenuPlacement(
      new DOMRect(100, 720, 180, 32),
      { width: 160, height: 120 },
      { viewport, margin: 8 },
    )
    expect(placement.top).toBeLessThan(0)
    expect(720 + placement.top + 120).toBeLessThanOrEqual(792)
  })
})
