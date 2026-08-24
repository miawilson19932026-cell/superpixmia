import { useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'

// Guards a backdrop click-to-close against dismiss-on-drag. A drag that starts
// inside the modal card and ends on the backdrop fires a click on the backdrop
// (click targets the common ancestor of pointerdown/pointerup), which would
// otherwise close the modal mid-selection. Only a press that begins ON the
// backdrop and barely moves counts as a real dismiss.
//
// Usage on the full-screen overlay:
//   const { onBackdropPointerDown, onBackdropClick } = useBackdropDismiss()
//   <div
//     className="fixed inset-0 ..."
//     onPointerDownCapture={onBackdropPointerDown}
//     onClick={(e) => onBackdropClick(e, () => setOpen(false))}
//   >
export function useBackdropDismiss() {
  const dragStart = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null)

  const onBackdropPointerDown = (e: ReactPointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY, target: e.target }
  }

  const onBackdropClick = (e: ReactMouseEvent<HTMLDivElement>, close: () => void) => {
    if (e.target !== e.currentTarget) return // card interior (also stopPropagation'd)
    const s = dragStart.current
    dragStart.current = null
    if (!s || s.target !== e.currentTarget) return // press began inside the card
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 6) return // a drag, not a click
    close()
  }

  return { onBackdropPointerDown, onBackdropClick }
}
