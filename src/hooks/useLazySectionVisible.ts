import { useEffect, useRef, useState } from 'react'

export type UseLazySectionVisibleOptions = {
  /** Pixels beyond the viewport to start loading (default starts slightly before scroll-in). */
  rootMargin?: string
  threshold?: number
}

/**
 * Flip to true once the target element intersects the viewport (including rootMargin slack).
 * Stays true after first intersection so content is not torn down when the user scrolls away.
 */
export function useLazySectionVisible(options: UseLazySectionVisibleOptions = {}) {
  const { rootMargin = '280px 0px', threshold = 0 } = options
  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isVisible) return
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { root: null, rootMargin, threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isVisible, rootMargin, threshold])

  return { ref, isVisible }
}
