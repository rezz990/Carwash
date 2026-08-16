"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "carwash:notif-enabled"
const STORAGE_ASKED_KEY = "carwash:notif-asked"

/**
 * Hook untuk mengelola Browser Notification API.
 * - Meminta izin notifikasi ke user
 * - Menyimpan preferensi ke localStorage
 * - Mengirim notifikasi native desktop/mobile
 */
export function useBrowserNotification() {
  const [enabled, setEnabled] = useState(false)
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [hasAsked, setHasAsked] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const isSupported = "Notification" in window
    setSupported(isSupported)

    if (isSupported) {
      setPermission(Notification.permission)
      const saved = localStorage.getItem(STORAGE_KEY)
      const asked = localStorage.getItem(STORAGE_ASKED_KEY)
      setEnabled(saved === "true" && Notification.permission === "granted")
      setHasAsked(asked === "true")
    }
  }, [])

  /**
   * Meminta izin notifikasi ke browser.
   * Hanya meminta sekali — kalau user pernah ditanya sebelumnya,
   * tidak akan ditanya lagi (kecuali user reset browser permission).
   */
  const requestPermission = useCallback(async () => {
    if (!supported) return false

    localStorage.setItem(STORAGE_ASKED_KEY, "true")
    setHasAsked(true)

    const result = await Notification.requestPermission()
    setPermission(result)

    if (result === "granted") {
      localStorage.setItem(STORAGE_KEY, "true")
      setEnabled(true)
      return true
    } else {
      localStorage.setItem(STORAGE_KEY, "false")
      setEnabled(false)
      return false
    }
  }, [supported])

  /**
   * Toggle notifikasi ON/OFF.
   * Kalau belum pernah minta izin, otomatis minta dulu.
   */
  const toggle = useCallback(async () => {
    if (!supported) return

    if (permission === "granted") {
      const newValue = !enabled
      localStorage.setItem(STORAGE_KEY, String(newValue))
      setEnabled(newValue)
      return
    }

    if (permission === "denied") {
      // User pernah nolak — tidak bisa minta lagi lewat kode.
      // Harus manual lewat browser settings.
      return
    }

    // Belum pernah ditanya → minta izin
    await requestPermission()
  }, [supported, permission, enabled, requestPermission])

  /**
   * Kirim notifikasi browser native.
   */
  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!supported || !enabled || permission !== "granted") return

      try {
        const notif = new Notification(title, {
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: "carwash-transaction",
          requireInteraction: false,
          ...options,
        })

        // Klik notifikasi → fokus ke tab
        notif.onclick = () => {
          window.focus()
          notif.close()
        }
      } catch {
        // Abaikan error notifikasi — jangan ganggu user
      }
    },
    [supported, enabled, permission]
  )

  return {
    supported,
    enabled,
    permission,
    hasAsked,
    requestPermission,
    toggle,
    notify,
  }
}
