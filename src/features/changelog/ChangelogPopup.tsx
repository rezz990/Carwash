"use client"

import { useSyncExternalStore, useState } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { CHANGELOG_ENTRIES } from "./entries"

const SEEN_KEY = "bujon_changelog_seen_version"
const SESSION_KEY = "bujon_changelog_snoozed_version"

const subscribe = () => () => {}

function isDismissed(version: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === version || sessionStorage.getItem(SESSION_KEY) === version
  } catch {
    // Akses storage bisa diblokir browser; anggap belum pernah ditutup.
    return false
  }
}

export function ChangelogPopup() {
  const [janganTampilkanLagi, setJanganTampilkanLagi] = useState(true)
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null)
  const entry = CHANGELOG_ENTRIES[0]

  // Selama SSR/hidrasi dianggap sudah ditutup agar HTML server dan klien sama;
  // setelah hidrasi, versi terbaru ditampilkan bila belum pernah ditutup user.
  const storedDismissed = useSyncExternalStore(
    subscribe,
    () => (entry ? isDismissed(entry.version) : true),
    () => true,
  )

  if (!entry || storedDismissed || dismissedVersion === entry.version) return null

  function tutup() {
    if (!entry) return
    try {
      if (janganTampilkanLagi) localStorage.setItem(SEEN_KEY, entry.version)
      else sessionStorage.setItem(SESSION_KEY, entry.version)
    } catch {
      // Abaikan; popup tetap ditutup untuk sesi ini.
    }
    setDismissedVersion(entry.version)
  }

  return (
    <Modal
      title="Apa yang baru?"
      description={`Versi ${entry.version} · ${entry.tanggal}`}
      onClose={tutup}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={janganTampilkanLagi}
              onChange={(event) => setJanganTampilkanLagi(event.target.checked)}
              className="size-4 cursor-pointer rounded accent-yellow-500"
            />
            Jangan tampilkan lagi
          </label>
          <Button onClick={tutup}>Mengerti</Button>
        </div>
      }
    >
      <ul className="space-y-3">
        {entry.items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-yellow-400/20 text-yellow-700">
              <Sparkles size={14} />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
