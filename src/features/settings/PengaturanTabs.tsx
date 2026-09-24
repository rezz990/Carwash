"use client"

import { useRef, useState, useTransition } from "react"
import { signOut } from "next-auth/react"
import { Bell, Clock3, Database, Download, KeyRound, Upload, UserRound } from "lucide-react"
import { useToast } from "@/components/toast/ToastProvider"
import { Button } from "@/components/ui/Button"
import { ErrorNotice } from "@/components/ui/Feedback"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { useBrowserNotification } from "@/hooks/useBrowserNotification"
import { MAX_BACKUP_BYTES } from "@/lib/transactionBackup"
import { changeOwnPassword, fetchAllTransaksiForBackup, restoreTransaksiBackup, updateLoginTimeout, updateOwnAccount } from "./actions"

type ResultHandler = (message: string, type: "success" | "error") => void
type Tab = "account" | "session" | "notification" | "backup"

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><h2 className="font-bold text-slate-900">{title}</h2>{description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}<div className="mt-5">{children}</div></section>
}

function AccountTab({ currentName, currentUsername, onResult }: { currentName: string; currentUsername: string; onResult: ResultHandler }) {
  const [name, setName] = useState(currentName)
  const [username, setUsername] = useState(currentUsername)
  const [profileError, setProfileError] = useState("")
  const [profilePending, startProfileTransition] = useTransition()
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordPending, startPasswordTransition] = useTransition()

  function saveProfile(event: React.FormEvent) {
    event.preventDefault(); setProfileError("")
    startProfileTransition(async () => {
      try {
        const result = await updateOwnAccount({ namaLengkap: name, username })
        if (result.error) setProfileError(result.error)
        else onResult("Profil berhasil diperbarui", "success")
      } catch { setProfileError("Profil belum tersimpan. Periksa koneksi lalu coba lagi.") }
    })
  }

  function savePassword(event: React.FormEvent) {
    event.preventDefault(); setPasswordError("")
    if (newPassword !== confirmation) return setPasswordError("Konfirmasi password baru tidak sama")
    startPasswordTransition(async () => {
      try {
        const result = await changeOwnPassword({ currentPassword: oldPassword, newPassword })
        if (result.error) return setPasswordError(result.error)
        onResult("Password berubah. Silakan login kembali.", "success")
        await signOut({ callbackUrl: "/login?reason=password-changed" })
      } catch { setPasswordError("Password belum berubah. Periksa koneksi lalu coba lagi.") }
    })
  }

  return <div className="grid gap-4 lg:grid-cols-2">
    <Card title="Profil akun" description="Nama tampil pada aktivitas, sedangkan username digunakan untuk login."><form onSubmit={saveProfile} className="space-y-4">{profileError && <ErrorNotice message={profileError} />}<div><label className="field-label" htmlFor="setting-name">Nama lengkap</label><Input id="setting-name" value={name} maxLength={255} onChange={(event) => setName(event.target.value)} placeholder="Nama lengkap" /></div><div><label className="field-label" htmlFor="setting-username">Username</label><Input id="setting-username" value={username} minLength={3} maxLength={64} autoCapitalize="none" autoCorrect="off" onChange={(event) => setUsername(event.target.value)} /></div><Button type="submit" className="w-full sm:w-auto" isLoading={profilePending}>Simpan profil</Button></form></Card>
    <Card title="Ubah password" description="Setelah password berubah, semua sesi web dan mobile akan dikeluarkan."><form onSubmit={savePassword} className="space-y-4">{passwordError && <ErrorNotice message={passwordError} />}<div><label className="field-label" htmlFor="old-password">Password sekarang</label><Input id="old-password" type="password" autoComplete="current-password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} /></div><div><label className="field-label" htmlFor="new-password">Password baru</label><Input id="new-password" type="password" minLength={8} maxLength={128} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Minimal 8 karakter" /></div><div><label className="field-label" htmlFor="confirm-password">Ulangi password baru</label><Input id="confirm-password" type="password" minLength={8} maxLength={128} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div><Button type="submit" className="w-full sm:w-auto" isLoading={passwordPending}><KeyRound size={17} /> Ubah password</Button></form></Card>
  </div>
}

function SessionTab({ initialMinutes, onResult }: { initialMinutes: number; onResult: ResultHandler }) {
  const [minutes, setMinutes] = useState(String(initialMinutes))
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  function save(event: React.FormEvent) {
    event.preventDefault(); setError("")
    startTransition(async () => {
      try {
        const result = await updateLoginTimeout(Number(minutes))
        if (result.error) setError(result.error)
        else onResult("Durasi logout otomatis diperbarui", "success")
      } catch { setError("Pengaturan belum tersimpan. Coba lagi.") }
    })
  }
  return <Card title="Logout otomatis" description="Sesi admin web dan aplikasi kasir berakhir bila tidak ada aktivitas selama durasi ini. Tab yang ditutup atau berada di latar belakang tetap dihitung."><form onSubmit={save} className="max-w-lg space-y-4">{error && <ErrorNotice message={error} />}<div className="grid grid-cols-4 gap-2">{[15,30,60,120].map((value) => <button key={value} type="button" aria-pressed={minutes===String(value)} onClick={() => setMinutes(String(value))} className={`min-h-11 rounded-xl border text-sm font-semibold ${minutes===String(value) ? "border-yellow-400 bg-yellow-50 text-slate-950" : "border-slate-200 text-slate-600"}`}>{value < 60 ? `${value} mnt` : `${value/60} jam`}</button>)}</div><div><label className="field-label" htmlFor="timeout-minutes">Durasi khusus (menit)</label><Input id="timeout-minutes" type="number" min={5} max={10080} inputMode="numeric" value={minutes} onChange={(event) => setMinutes(event.target.value)} /><p className="mt-1.5 text-xs text-slate-500">Minimal 5 menit, maksimal 7 hari.</p></div><Button type="submit" className="w-full sm:w-auto" isLoading={pending}><Clock3 size={17} /> Simpan durasi</Button></form></Card>
}

function NotificationTab({ onResult }: { onResult: ResultHandler }) {
  const { supported, enabled, permission, toggle } = useBrowserNotification()
  async function handleToggle() {
    if (permission === "denied") return onResult("Izin notifikasi diblokir oleh browser. Ubah melalui pengaturan situs.", "error")
    await toggle()
    onResult(enabled ? "Notifikasi browser dimatikan" : "Preferensi notifikasi browser diperbarui", "success")
  }
  return <Card title="Notifikasi transaksi" description="Tampilkan notifikasi perangkat ketika kasir mencatat transaksi baru. Toast di dalam aplikasi tetap muncul."><div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4"><div><p className="text-sm font-semibold text-slate-800">Notifikasi browser</p><p className="mt-1 text-xs text-slate-500">{!supported ? "Browser ini tidak mendukung notifikasi." : permission === "denied" ? "Izin diblokir di pengaturan browser." : enabled ? "Aktif pada perangkat ini." : "Nonaktif pada perangkat ini."}</p></div><button type="button" role="switch" aria-checked={enabled} onClick={() => void handleToggle()} disabled={!supported || permission === "denied"} className={`relative h-7 w-12 shrink-0 rounded-full ${enabled ? "bg-yellow-400" : "bg-slate-300"} disabled:opacity-40`}><span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} /></button></div><p className="mt-4 text-xs leading-5 text-slate-500">Pengaturan tersimpan hanya pada browser dan perangkat yang sedang digunakan.</p></Card>
}

function BackupTab({ onResult }: { onResult: ResultHandler }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [exporting, setExporting] = useState(false)
  const [restoring, startRestore] = useTransition()

  async function download() {
    setExporting(true)
    try {
      const result = await fetchAllTransaksiForBackup()
      if (result.error) return onResult(result.error, "error")
      const url = URL.createObjectURL(new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" }))
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `transaksi-bujon-${new Date().toISOString().slice(0,10)}.json`; anchor.click(); URL.revokeObjectURL(url)
      onResult(`${result.data.length} transaksi berhasil disalin`, "success")
    } catch { onResult("Salinan transaksi gagal disiapkan", "error") }
    finally { setExporting(false) }
  }

  function selectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    if (!selected) return
    if (selected.size > MAX_BACKUP_BYTES) { event.target.value = ""; return onResult("File terlalu besar. Maksimal 20 MB.", "error") }
    if (!selected.name.toLowerCase().endsWith(".json")) { event.target.value = ""; return onResult("Pilih file JSON hasil salinan aplikasi.", "error") }
    setFile(selected)
  }

  function restore() {
    if (!file) return
    startRestore(async () => {
      try {
        const parsed: unknown = JSON.parse(await file.text())
        const result = await restoreTransaksiBackup({ rows: parsed })
        if (result.error) onResult(result.error, "error")
        else onResult(`${result.jumlahRestored} transaksi ditambahkan, ${result.jumlahSkipped} duplikat dilewati`, "success")
      } catch { onResult("File tidak valid atau rusak.", "error") }
      finally { setFile(null); if (fileRef.current) fileRef.current.value = "" }
    })
  }

  return <div className="grid gap-4 lg:grid-cols-2"><Card title="Salin transaksi" description="Unduh transaksi sebagai JSON untuk pemulihan tambahan."><Button variant="outline" className="w-full sm:w-auto" onClick={() => void download()} isLoading={exporting}><Download size={17} /> Unduh JSON</Button></Card><Card title="Pulihkan transaksi" description="Transaksi baru ditambahkan; ID yang sudah ada dilewati tanpa menimpa data."><input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={selectFile} /><Button variant="outline" className="w-full sm:w-auto" onClick={() => fileRef.current?.click()}><Upload size={17} /> Pilih file JSON</Button></Card><div className="lg:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Backup operasional:</strong> file ini hanya berisi transaksi dan membutuhkan user serta jenis kendaraan yang sesuai. Tetap aktifkan backup database terjadwal di hosting.</div>{file && <Modal title="Pulihkan transaksi?" onClose={() => setFile(null)} busy={restoring} footer={<div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => setFile(null)} disabled={restoring}>Batal</Button><Button onClick={restore} isLoading={restoring}>Pulihkan</Button></div>}><div className="space-y-3"><p className="text-sm text-slate-600">File <strong>{file.name}</strong> akan diperiksa seluruhnya sebelum data ditambahkan.</p><p className="text-xs text-slate-500">Ukuran: {(file.size/1024).toLocaleString("id-ID", {maximumFractionDigits:1})} KB</p></div></Modal>}</div>
}

const tabs = [
  { id: "account", label: "Akun", icon: UserRound },
  { id: "session", label: "Sesi", icon: Clock3 },
  { id: "notification", label: "Notifikasi", icon: Bell },
  { id: "backup", label: "Data", icon: Database },
] as const

export function PengaturanTabs({ currentNama, currentUsername, loginTimeoutMinutes }: { currentNama: string; currentUsername: string; loginTimeoutMinutes: number }) {
  const [active, setActive] = useState<Tab>("account")
  const { addToast } = useToast()
  return <div className="space-y-4">
    <div className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" role="tablist">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={active===id} onClick={() => setActive(id)} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold sm:min-h-11 sm:flex-row sm:text-sm ${active===id ? "bg-yellow-400 text-slate-950" : "text-slate-500 hover:bg-slate-50"}`}><Icon size={17} />{label}</button>)}</div>
    {active === "account" && <AccountTab currentName={currentNama} currentUsername={currentUsername} onResult={addToast} />}
    {active === "session" && <SessionTab initialMinutes={loginTimeoutMinutes} onResult={addToast} />}
    {active === "notification" && <NotificationTab onResult={addToast} />}
    {active === "backup" && <BackupTab onResult={addToast} />}
  </div>
}
