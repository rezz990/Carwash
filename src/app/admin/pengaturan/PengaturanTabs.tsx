"use client"

import { useState, useRef, useTransition } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useBrowserNotification } from "@/hooks/useBrowserNotification"
import {
  updateOwnProfile,
  updateOwnUsername,
  changeOwnPassword,
  fetchAllTransaksiForBackup,
  restoreTransaksiBackup,
  resetTransaksiData,
  type BackupRow,
} from "./actions"

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useState(() => {
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  })
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-300 ${
      type === "success" ? "bg-emerald-50/95 border-emerald-200 text-emerald-800" : "bg-red-50/95 border-red-200 text-red-800"
    }`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-current opacity-50 hover:opacity-100 transition-opacity">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
      </button>
    </div>
  )
}

// ---------------------------------------------------------
// TAB: AKUN SAYA
// ---------------------------------------------------------
function AkunSayaTab({
  currentNama,
  currentUsername,
  onResult,
}: {
  currentNama: string
  currentUsername: string
  onResult: (msg: string, type: "success" | "error") => void
}) {
  const [namaLengkap, setNamaLengkap] = useState(currentNama)
  const [namaPending, startNamaTransition] = useTransition()

  const [username, setUsername] = useState(currentUsername)
  const [usernamePending, startUsernameTransition] = useTransition() // baru

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordPending, startPasswordTransition] = useTransition()

  function handleSaveNama(e: React.FormEvent) {
    e.preventDefault()
    startNamaTransition(async () => {
      const result = await updateOwnProfile(namaLengkap)
      if (result.error) onResult(result.error, "error")
      else onResult("Nama berhasil diperbarui", "success")
    })
  }

    function handleSaveUsername(e: React.FormEvent) {
    e.preventDefault()
    startUsernameTransition(async () => {
      const result = await updateOwnUsername(username)
      if (result.error) onResult(result.error, "error")
      else onResult("Username berhasil diperbarui", "success")
    })
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password baru tidak cocok")
      return
    }

    startPasswordTransition(async () => {
      const result = await changeOwnPassword({ currentPassword, newPassword })
      if (result.error) {
        setPasswordError(result.error)
      } else {
        onResult("Password berhasil diubah", "success")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Nama Lengkap</h3>
        <form onSubmit={handleSaveNama} className="flex gap-3 items-end max-w-md">
          <div className="flex-1 space-y-1.5">
            <Input value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)} placeholder="Nama lengkap Anda" />
          </div>
          <Button type="submit" disabled={namaPending}>
            {namaPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
  <h3 className="text-sm font-bold text-slate-700 mb-4">Username</h3>
  <form onSubmit={handleSaveUsername} className="flex gap-3 items-end max-w-md">
    <div className="flex-1 space-y-1.5">
      <Input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username untuk login"
        autoComplete="username"
      />
    </div>
    <Button type="submit" disabled={usernamePending}>
      {usernamePending ? "Menyimpan..." : "Simpan"}
    </Button>
  </form>
</div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Ubah Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          {passwordError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">{passwordError}</div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Password Lama</label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Password Baru</label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Konfirmasi Password Baru</label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} required />
          </div>
          <Button type="submit" disabled={passwordPending}>
            {passwordPending ? "Menyimpan..." : "Ubah Password"}
          </Button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------
// TAB: NOTIFIKASI
// ---------------------------------------------------------
function NotifikasiTab({ onResult }: { onResult: (msg: string, type: "success" | "error") => void }) {
  const { supported, enabled, permission, toggle } = useBrowserNotification()

  async function handleToggle() {
    await toggle()
    if (permission === "denied") {
      onResult("Izin notifikasi ditolak. Aktifkan manual di pengaturan browser.", "error")
    } else if (permission === "granted" || !enabled) {
      onResult(enabled ? "Notifikasi browser dimatikan" : "Notifikasi browser diaktifkan", "success")
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-1">Notifikasi Browser</h3>
            <p className="text-sm text-slate-500 max-w-md">
              Tampilkan notifikasi native desktop/mobile saat ada transaksi baru dari kasir.
              Notifikasi tetap muncul sebagai toast di dalam aplikasi meskipun ini dimatikan.
            </p>
            {!supported && (
              <p className="text-xs text-amber-600 mt-2">Browser Anda tidak mendukung notifikasi web.</p>
            )}
            {supported && permission === "denied" && (
              <p className="text-xs text-red-600 mt-2">
                Izin notifikasi pernah ditolak. Buka pengaturan browser → Privasi & Security → Notifikasi → Izinkan situs ini.
              </p>
            )}
          </div>
          <button
            onClick={handleToggle}
            disabled={!supported || permission === "denied"}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed ${
              enabled ? "bg-indigo-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <span className={`w-2 h-2 rounded-full ${enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
          Status: {enabled ? "Aktif" : "Nonaktif"}
          {permission === "granted" && enabled && (
            <span className="text-emerald-600 font-medium"> — Notifikasi browser akan muncul</span>
          )}
        </div>
      </div>

      <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-6">
        <h3 className="text-sm font-bold text-indigo-700 mb-2">Cara Kerja</h3>
        <ul className="text-sm text-indigo-600/80 space-y-1.5 list-disc list-inside">
          <li>Saat kasir mencatat transaksi baru, sistem akan mengirim notifikasi realtime</li>
          <li>Toast in-app selalu muncul di pojok kanan bawah</li>
          <li>Notifikasi browser (native) hanya muncul jika toggle di atas diaktifkan</li>
          <li>Suara notifikasi otomatis dimainkan saat ada transaksi baru</li>
          <li>Data tetap realtime meskipun notifikasi browser dimatikan</li>
        </ul>
      </div>
    </div>
  )
}

// ---------------------------------------------------------
// TAB: ZONA BAHAYA
// ---------------------------------------------------------
function ZonaBahayaTab({ onResult }: { onResult: (msg: string, type: "success" | "error") => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restoreMode, setRestoreMode] = useState<"append" | "replace">("append")
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [isRestoring, startRestoreTransition] = useTransition()

  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState("")
  const [isResetting, startResetTransition] = useTransition()

  async function handleExportBackup() {
    setIsExporting(true)
    try {
      const result = await fetchAllTransaksiForBackup()
      if (result.error) {
        onResult(result.error, "error")
        return
      }
      const json = JSON.stringify(result.data, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `backup-transaksi-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      onResult(`Backup ${result.data.length} transaksi berhasil di-download`, "success")
    } finally {
      setIsExporting(false)
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setRestoreFile(file)
      setShowRestoreConfirm(true)
    }
  }

  function handleRestore() {
    if (!restoreFile) return
    startRestoreTransition(async () => {
      try {
        const text = await restoreFile.text()
        const rows: BackupRow[] = JSON.parse(text)
        const result = await restoreTransaksiBackup({ rows, mode: restoreMode })
        if (result.error) {
          onResult(result.error, "error")
        } else {
          onResult(`${result.jumlahRestored} transaksi berhasil di-restore`, "success")
        }
      } catch {
        onResult("File tidak valid atau bukan format JSON backup yang benar", "error")
      }
      setShowRestoreConfirm(false)
      setRestoreFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    })
  }

  function handleReset() {
    startResetTransition(async () => {
      const result = await resetTransaksiData()
      if (result.error) {
        onResult(result.error, "error")
      } else {
        onResult("Semua data transaksi berhasil dihapus", "success")
      }
      setShowResetConfirm(false)
      setResetConfirmText("")
    })
  }

  return (
    <div className="space-y-6">
      {/* Backup */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-1">Export Backup</h3>
        <p className="text-sm text-slate-500 mb-4">Download semua data transaksi sebagai file JSON. Simpan file ini di tempat aman sebelum melakukan reset atau perubahan besar.</p>
        <Button variant="outline" onClick={handleExportBackup} disabled={isExporting}>
          {isExporting ? "Menyiapkan..." : "Download Backup"}
        </Button>
      </div>

      {/* Restore */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-1">Restore dari Backup</h3>
        <p className="text-sm text-slate-500 mb-4">Upload file JSON backup yang pernah di-download sebelumnya untuk mengembalikan data transaksi.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileSelected}
          className="hidden"
        />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          Pilih File Backup
        </Button>
      </div>

      {/* Reset - danger zone visual */}
      <div className="bg-red-50/50 rounded-xl border border-red-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-red-700 mb-1">Reset Data Transaksi</h3>
        <p className="text-sm text-red-600/80 mb-4">
          Menghapus SEMUA data transaksi secara permanen. Data jenis kendaraan dan akun user tidak terpengaruh.
          Pastikan sudah export backup sebelum melakukan ini.
        </p>
        <Button
          className="bg-red-600 hover:bg-red-700 text-white"
          onClick={() => setShowResetConfirm(true)}
        >
          Reset Semua Data Transaksi
        </Button>
      </div>

      {/* Modal konfirmasi restore */}
      {showRestoreConfirm && restoreFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto border border-slate-200 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="px-6 py-5">
              <div className="w-11 h-11 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Restore dari &quot;{restoreFile.name}&quot;</h2>
              <p className="text-sm text-slate-500 mt-2">Pilih cara restore-nya:</p>

              <div className="space-y-2 mt-4">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input type="radio" checked={restoreMode === "append"} onChange={() => setRestoreMode("append")} className="mt-1" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Tambahkan ke data yang ada</p>
                    <p className="text-xs text-slate-500">Data dari backup ditambahkan, data yang sudah ada tetap aman.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-xl border border-red-200 bg-red-50/50 cursor-pointer hover:bg-red-50">
                  <input type="radio" checked={restoreMode === "replace"} onChange={() => setRestoreMode("replace")} className="mt-1" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Timpa (hapus data lama dulu)</p>
                    <p className="text-xs text-red-600/80">Semua data transaksi saat ini akan DIHAPUS PERMANEN sebelum data backup dimasukkan.</p>
                  </div>
                </label>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setShowRestoreConfirm(false); setRestoreFile(null); if (fileInputRef.current) fileInputRef.current.value = "" }}
                disabled={isRestoring}
              >
                Batal
              </Button>
              <Button
                type="button"
                className={`flex-1 ${restoreMode === "replace" ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                onClick={handleRestore}
                disabled={isRestoring}
              >
                {isRestoring ? "Merestore..." : "Ya, Restore"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal konfirmasi reset - wajib ketik "HAPUS" */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto border border-slate-200 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="px-6 py-5">
              <div className="w-11 h-11 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Hapus semua data transaksi?</h2>
              <p className="text-sm text-slate-500 mt-2">
                Tindakan ini <span className="font-semibold text-red-600">permanen dan tidak bisa dibatalkan</span>.
                Ketik <span className="font-mono font-bold text-slate-900">HAPUS</span> untuk konfirmasi.
              </p>
              <Input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="Ketik HAPUS"
                className="mt-3"
                autoFocus
              />
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setShowResetConfirm(false); setResetConfirmText("") }}
                disabled={isResetting}
              >
                Batal
              </Button>
              <Button
                type="button"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleReset}
                disabled={isResetting || resetConfirmText !== "HAPUS"}
              >
                {isResetting ? "Menghapus..." : "Hapus Permanen"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------
// MAIN
// ---------------------------------------------------------
export function PengaturanTabs({ currentNama, currentUsername }: { currentNama: string, currentUsername: string }) {
  const [activeTab, setActiveTab] = useState<"akun" | "notifikasi" | "bahaya">("akun")
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const showToast = (message: string, type: "success" | "error") => setToast({ message, type })

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab("akun")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "akun" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          Akun Saya
        </button>
        <button
          onClick={() => setActiveTab("notifikasi")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "notifikasi" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          Notifikasi
        </button>
        <button
          onClick={() => setActiveTab("bahaya")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "bahaya" ? "bg-red-600 text-white" : "bg-white text-red-600 border border-red-200"
          }`}
        >
          Zona Bahaya
        </button>
      </div>

      {activeTab === "akun" && <AkunSayaTab currentNama={currentNama} currentUsername={currentUsername} onResult={showToast} />}
      {activeTab === "notifikasi" && <NotifikasiTab onResult={showToast} />}
      {activeTab === "bahaya" && <ZonaBahayaTab onResult={showToast} />}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}