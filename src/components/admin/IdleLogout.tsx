"use client"

import { useEffect } from "react"
import { signOut, useSession } from "next-auth/react"

const STORAGE_KEY = "carwash.admin.lastActivity"
const EVENTS: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"]

export function IdleLogout({ timeoutMinutes }: { timeoutMinutes: number }) {
  const { update } = useSession()

  useEffect(() => {
    const timeoutMs = timeoutMinutes * 60_000
    let lastActivity = Number(localStorage.getItem(STORAGE_KEY)) || Date.now()
    let lastPersisted = lastActivity
    let lastSessionSync = lastActivity
    let loggingOut = false

    const logoutIfIdle = () => {
      if (!loggingOut && Date.now() - lastActivity >= timeoutMs) {
        loggingOut = true
        localStorage.removeItem(STORAGE_KEY)
        void signOut({ callbackUrl: "/login?reason=timeout" })
      }
    }
    const recordActivity = () => {
      const now = Date.now()
      lastActivity = now
      if (now - lastPersisted >= 5_000) {
        localStorage.setItem(STORAGE_KEY, String(now))
        lastPersisted = now
      }
      if (now - lastSessionSync >= 60_000) {
        lastSessionSync = now
        void update({ lastActivity: now })
      }
    }

    const syncFromOtherTab = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      const value = Number(event.newValue)
      if (Number.isFinite(value) && value > lastActivity) lastActivity = value
    }

    logoutIfIdle()
    if (!loggingOut) {
      localStorage.setItem(STORAGE_KEY, String(lastActivity))
    }
    for (const event of EVENTS) window.addEventListener(event, recordActivity, { passive: true })
    window.addEventListener("focus", logoutIfIdle)
    document.addEventListener("visibilitychange", logoutIfIdle)
    window.addEventListener("storage", syncFromOtherTab)
    const interval = window.setInterval(logoutIfIdle, Math.min(30_000, timeoutMs))

    return () => {
      for (const event of EVENTS) window.removeEventListener(event, recordActivity)
      window.removeEventListener("focus", logoutIfIdle)
      document.removeEventListener("visibilitychange", logoutIfIdle)
      window.removeEventListener("storage", syncFromOtherTab)
      window.clearInterval(interval)
    }
  }, [timeoutMinutes, update])

  return null
}
