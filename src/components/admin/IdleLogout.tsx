"use client"

import { useEffect, useEffectEvent, useRef } from "react"
import { signOut, useSession } from "next-auth/react"
import { isSessionExpired } from "@/lib/sessionPolicy"

const SYNC_INTERVAL_MS = 30_000
const PERSIST_INTERVAL_MS = 2_000

export function IdleLogout({ timeoutMinutes }: { timeoutMinutes: number }) {
  const { data: session, status, update } = useSession()
  const sessionId = session?.sessionId
  const signingOut = useRef(false)
  const snapshot = useEffectEvent(() => session)
  const sync = useEffectEvent(() => update({ activity: true }))
  const logout = useEffectEvent(() => {
    if (signingOut.current) return
    signingOut.current = true
    void signOut({ callbackUrl: "/login?reason=timeout" }).catch(() => {
      window.location.replace("/login?reason=timeout")
    })
  })

  useEffect(() => {
    if (status === "unauthenticated" || session?.error) logout()
  }, [status, session?.error])

  useEffect(() => {
    const initial = snapshot()
    if (!sessionId || !initial?.lastActivity) return
    const browserNow = Date.now()
    if (typeof initial.lastActivity !== "number" || !Number.isFinite(initial.lastActivity)) {
      logout()
      return
    }
    // lastActivity dibuat oleh server, sedangkan pengecekan idle berjalan di
    // perangkat pengguna. Normalisasi perbedaan jam agar perangkat yang sedikit
    // tertinggal tidak langsung dianggap timeout sesaat setelah login.
    const initialLastActivity = Math.min(initial.lastActivity, browserNow)
    if (isSessionExpired({ ...initial, lastActivity: initialLastActivity }, browserNow)) {
      logout()
      return
    }
    const key = `carwash.admin.activity:${sessionId}`
    let lastActivity = initialLastActivity
    let lastSyncedActivity = initialLastActivity
    let lastRequest = 0
    let lastPersisted = 0
    let inFlight = false
    let disposed = false
    const timeoutMs = Math.min(timeoutMinutes, initial.idleTimeoutMinutes ?? timeoutMinutes) * 60_000
    const read = () => {
      try {
        const value = Number(localStorage.getItem(key))
        if (Number.isFinite(value) && value <= Date.now() && value > lastActivity) lastActivity = value
      } catch { /* Storage is optional in restricted browsers. */ }
    }
    const check = () => {
      read()
      if (signingOut.current) return false
      if (Date.now() - lastActivity >= timeoutMs) { logout(); return false }
      return true
    }
    const flush = async () => {
      if (!check() || disposed || document.visibilityState !== "visible" || inFlight) return
      if (lastActivity <= lastSyncedActivity || Date.now() - lastRequest < SYNC_INTERVAL_MS) return
      const activity = lastActivity
      inFlight = true
      lastRequest = Date.now()
      try {
        const result = await sync()
        if (disposed) return
        if (!result?.user || result.error) logout()
        else lastSyncedActivity = activity
      } catch { /* Retry only while active. Server expiry remains authoritative. */ }
      finally { inFlight = false }
    }
    const record = () => {
      // Check before recording the first tap after sleep, never resurrect a session.
      if (!check() || document.visibilityState !== "visible") return
      lastActivity = Date.now()
      if (lastActivity - lastPersisted >= PERSIST_INTERVAL_MS) {
        try { localStorage.setItem(key, String(lastActivity)) } catch { /* optional tab synchronization */ }
        lastPersisted = lastActivity
      }
      void flush()
    }
    const resume = () => { if (check()) void flush() }
    const onStorage = (event: StorageEvent) => { if (event.key === key) resume() }
    read()
    const events = ["pointerdown", "keydown", "scroll"] as const
    // Content-element scroll does not bubble to window.
    for (const event of events) document.addEventListener(event, record, { passive: true, capture: true })
    window.addEventListener("focus", resume)
    window.addEventListener("storage", onStorage)
    document.addEventListener("visibilitychange", resume)
    const timer = window.setInterval(resume, 5_000)
    return () => {
      disposed = true
      for (const event of events) document.removeEventListener(event, record, true)
      window.removeEventListener("focus", resume)
      window.removeEventListener("storage", onStorage)
      document.removeEventListener("visibilitychange", resume)
      window.clearInterval(timer)
    }
  }, [sessionId, timeoutMinutes])
  return null
}
