import { useEffect, type RefObject } from 'react'

/**
 * Minimal ARIA-menu keyboard support for the funnel canvas context menus:
 * moves focus to the first menu item on open, cycles focus with
 * ArrowUp/ArrowDown, and restores focus to the previously focused element
 * when the menu closes via keyboard or item activation.
 *
 * The container must carry `role="menu"` and actionable items `role="menuitem"`.
 */
export function useContextMenuA11y(
  open: boolean,
  menuRef: RefObject<HTMLElement | null>,
  /** Changes when the menu re-opens for a different target (re-runs focus management). */
  contentKey?: string,
  options?: {
    /**
     * Focus the menu container instead of the first item on open. Use when the
     * first item is destructive — auto-focusing it would make Enter delete
     * immediately. The container needs `tabIndex={-1}`; ArrowDown enters the items.
     */
    focusContainer?: boolean
  },
): void {
  const focusContainer = options?.focusContainer ?? false
  useEffect(() => {
    if (!open) return
    const menu = menuRef.current
    if (!menu) return

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const menuItems = () =>
      Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true',
      )

    if (focusContainer) {
      menu.focus()
    } else {
      menuItems()[0]?.focus()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      // Let embedded inputs keep native ArrowUp/ArrowDown behavior (number steppers).
      const target = e.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return
      }
      const items = menuItems()
      if (items.length === 0) return
      e.preventDefault()
      const currentIndex = items.indexOf(document.activeElement as HTMLElement)
      const delta = e.key === 'ArrowDown' ? 1 : -1
      const nextIndex =
        currentIndex === -1
          ? delta === 1
            ? 0
            : items.length - 1
          : (currentIndex + delta + items.length) % items.length
      items[nextIndex]?.focus()
    }

    menu.addEventListener('keydown', handleKeyDown)
    return () => {
      menu.removeEventListener('keydown', handleKeyDown)
      // Only restore focus when it is still inside the menu (Escape / item click).
      // Outside clicks already placed focus deliberately — do not steal it back.
      const active = document.activeElement
      if (active === null || active === document.body || menu.contains(active)) {
        previouslyFocused?.focus()
      }
    }
  }, [open, menuRef, contentKey, focusContainer])
}
