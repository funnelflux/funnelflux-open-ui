export type ViewportPoint = { x: number; y: number }

export type ViewportSize = { width: number; height: number }

export type ViewportClampOptions = {
  margin?: number
  viewport?: ViewportSize
}

const DEFAULT_MARGIN = 8

function viewportSize(options: ViewportClampOptions): ViewportSize {
  if (options.viewport) return options.viewport
  if (typeof window === 'undefined') return { width: 0, height: 0 }
  return { width: window.innerWidth, height: window.innerHeight }
}

/** Keep a fixed-position menu fully inside the viewport (left/top/right/bottom). */
export function clampFixedPositionToViewport(
  anchor: ViewportPoint,
  menuSize: ViewportSize,
  options: ViewportClampOptions = {},
): ViewportPoint {
  const margin = options.margin ?? DEFAULT_MARGIN
  const viewport = viewportSize(options)

  const maxX = Math.max(margin, viewport.width - menuSize.width - margin)
  const maxY = Math.max(margin, viewport.height - menuSize.height - margin)

  return {
    x: Math.min(Math.max(margin, anchor.x), maxX),
    y: Math.min(Math.max(margin, anchor.y), maxY),
  }
}

export type SubmenuPlacement = {
  /** Open to the right (`left-full`) or left (`right-full`) of the trigger row. */
  horizontal: 'end' | 'start'
  /** Vertical offset in px from the trigger row top. */
  top: number
}

/** Position a submenu relative to its trigger so it stays inside the viewport. */
export function computeSubmenuPlacement(
  triggerRect: DOMRect,
  submenuSize: ViewportSize,
  options: ViewportClampOptions = {},
): SubmenuPlacement {
  const margin = options.margin ?? DEFAULT_MARGIN
  const viewport = viewportSize(options)

  const fitsRight = triggerRect.right + submenuSize.width <= viewport.width - margin
  const horizontal: SubmenuPlacement['horizontal'] = fitsRight ? 'end' : 'start'

  let top = 0
  const submenuBottom = triggerRect.top + submenuSize.height
  if (submenuBottom > viewport.height - margin) {
    top = viewport.height - margin - submenuSize.height - triggerRect.top
  }
  const submenuTop = triggerRect.top + top
  if (submenuTop < margin) {
    top += margin - submenuTop
  }

  return { horizontal, top }
}
