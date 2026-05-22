import { useLayoutEffect, type RefObject } from 'react'
import {
  clampFixedPositionToViewport,
  type ViewportPoint,
} from '@/lib/clampFixedPositionToViewport'

/**
 * After mount, measure a fixed-position menu and clamp it inside the viewport.
 * Mutates element styles directly to avoid layout flicker and effect setState.
 */
export function useClampedFixedMenu(
  anchor: ViewportPoint | null,
  menuRef: RefObject<HTMLElement | null>,
  sizeKey = '',
): void {
  useLayoutEffect(() => {
    const element = menuRef.current
    if (!anchor || !element) return

    function applyPosition() {
      const menu = menuRef.current
      if (!menu || !anchor) return
      const { width, height } = menu.getBoundingClientRect()
      const clamped = clampFixedPositionToViewport(anchor, { width, height })
      menu.style.left = `${clamped.x}px`
      menu.style.top = `${clamped.y}px`
      menu.style.visibility = 'visible'
    }

    element.style.visibility = 'hidden'
    applyPosition()
    window.addEventListener('resize', applyPosition)
    return () => window.removeEventListener('resize', applyPosition)
  }, [anchor, menuRef, sizeKey])
}
