import { useCallback, useEffect, useRef, useState, type JSX, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function ScrollArea({
  children,
  className
}: {
  children: ReactNode
  className?: string
}): JSX.Element {
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const dragOffset = useRef(0)
  const [thumb, setThumb] = useState({ top: 0, height: 0, visible: false })

  const sync = useCallback((): void => {
    const el = viewportRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const overflow = scrollHeight > clientHeight + 1
    if (!overflow) {
      setThumb({ top: 0, height: 0, visible: false })
      return
    }
    const height = Math.max(28, (clientHeight / scrollHeight) * clientHeight)
    const maxTop = clientHeight - height
    const top =
      maxTop <= 0 ? 0 : (scrollTop / (scrollHeight - clientHeight)) * maxTop
    setThumb({ top, height, visible: true })
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    sync()
    const onScroll = (): void => sync()
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(() => sync())
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [sync, children])

  useEffect(() => {
    const onMove = (e: PointerEvent): void => {
      if (!dragging.current) return
      const el = viewportRef.current
      if (!el) return
      const track = el.parentElement?.querySelector('[data-scroll-track]') as HTMLElement | null
      if (!track) return
      const rect = track.getBoundingClientRect()
      const { scrollHeight, clientHeight } = el
      const thumbHeight = thumb.height
      const maxTop = clientHeight - thumbHeight
      const y = e.clientY - rect.top - dragOffset.current
      const clamped = Math.min(maxTop, Math.max(0, y))
      const ratio = maxTop <= 0 ? 0 : clamped / maxTop
      el.scrollTop = ratio * (scrollHeight - clientHeight)
    }
    const onUp = (): void => {
      dragging.current = false
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [thumb.height])

  return (
    <div className={cn('relative min-h-0 flex-1', className)}>
      <div
        ref={viewportRef}
        className="app-scroll-viewport h-full overflow-y-auto overflow-x-hidden"
      >
        {children}
      </div>
      {thumb.visible ? (
        <div
          data-scroll-track
          className="pointer-events-none absolute inset-y-0 right-0 w-2 bg-black"
          aria-hidden
        >
          <div
            className="pointer-events-auto absolute right-0 w-2 rounded-full bg-[#3a3a3c] hover:bg-[#48484a]"
            style={{ top: thumb.top, height: thumb.height }}
            onPointerDown={(e) => {
              e.preventDefault()
              dragging.current = true
              dragOffset.current = e.clientY - (e.currentTarget.getBoundingClientRect().top)
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
