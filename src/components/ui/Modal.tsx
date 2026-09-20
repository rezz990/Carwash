"use client"

import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/utils/cn"

const subscribe = () => () => {}
let openDialogs = 0
let previousOverflow = ""

export function Modal({ title, description, children, footer, onClose, busy = false, wide = false, fullScreenMobile = false }: {
  title: string; description?: string; children: ReactNode; footer?: ReactNode
  onClose: () => void; busy?: boolean; wide?: boolean; fullScreenMobile?: boolean
}) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const close = () => { if (!busy) onClose() }
  useEffect(() => {
    if (!mounted || !ref.current) return
    const dialog = ref.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (openDialogs++ === 0) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"
    }
    dialog.showModal()
    return () => {
      dialog.close()
      if (--openDialogs === 0) document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [mounted])
  if (!mounted) return null
  return createPortal(
    <dialog ref={ref} className={cn("app-dialog", wide && "app-dialog-wide")} data-fullscreen={fullScreenMobile || undefined}
      aria-labelledby={titleId} aria-describedby={description ? `${titleId}-description` : undefined}
      onCancel={event => { event.preventDefault(); close() }}
      onClick={event => {
        if (event.target !== event.currentTarget) return
        const box = event.currentTarget.getBoundingClientRect()
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close()
      }}>
      <div className="app-dialog-frame">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
          <div className="min-w-0"><h2 id={titleId} className="text-lg font-bold text-slate-900 break-words">{title}</h2>
            {description && <p id={`${titleId}-description`} className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <button type="button" disabled={busy} onClick={onClose} className="icon-button shrink-0" aria-label={`Tutup ${title}`}><X size={20} /></button>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">{children}</div>
        {footer && <footer className="dialog-footer shrink-0 border-t border-slate-100 bg-white p-4 sm:p-5">{footer}</footer>}
      </div>
    </dialog>, document.body,
  )
}
