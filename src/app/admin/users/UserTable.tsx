"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { createUser, resetPassword, updateUserRole, toggleAktifUser, updateUserProfile, deleteUser } from "./actions"
import { useScrollToForm } from "@/hooks/useScrollToForm"

type UserProfile = {
  id: string
  username: string
  nama_lengkap: string | null
  role: string
  aktif: boolean
  created_at: string
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-300 ${
      type === "success"
        ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
        : "bg-red-50/95 border-red-200 text-red-800"
    }`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-current opacity-50 hover:opacity-100 transition-opacity">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
      </button>
    </div>
  )
}

// Modal tambah user baru
function AddUserForm({ onClose, onResult }: { onClose: () => void; onResult: (msg: string, type: "success" | "error") => void }) {
  const formRef = useScrollToForm<HTMLDivElement>()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [namaLengkap, setNamaLengkap] = useState("")
  const [role, setRole] = useState("kasir")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const formData = new FormData()
    formData.append("username", username)
    formData.append("password", password)
    formData.append("nama_lengkap", namaLengkap)
    formData.append("role", role)

    startTransition(async () => {
      const result = await createUser(formData)
      if (result.error) {
        setError(result.error)
      } else {
        onResult(`User ${username} berhasil dibuat`, "success")
        onClose()
      }
    })
  }

  return (
    <div ref={formRef} className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900">Tambah User Baru</h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Kembali
        </button>
      </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
          )}

          <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Username</label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="misal: kasir2"
            required
            autoFocus
          />
          <p className="text-xs text-slate-400">Huruf, angka, underscore saja. Tanpa spasi atau @.</p>
        </div>

          <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Nama Lengkap</label>
          <Input
            value={namaLengkap}
            onChange={(e) => setNamaLengkap(e.target.value)}
            placeholder="Opsional"
          />
        </div>

           <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            required
            minLength={6}
          />
        </div>

          <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Role</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole("kasir")}
              className={`h-11 rounded-xl border-2 text-sm font-semibold transition-all ${
                role === "kasir"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              Kasir
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`h-11 rounded-xl border-2 text-sm font-semibold transition-all ${
                role === "admin"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Modal reset password
function ResetPasswordForm({ user, onClose, onResult }: { user: UserProfile; onClose: () => void; onResult: (msg: string, type: "success" | "error") => void }) {
  const formRef = useScrollToForm<HTMLDivElement>()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await resetPassword(user.id, password)
      if (result.error) {
        setError(result.error)
      } else {
        onResult(`Password ${user.username} berhasil direset`, "success")
        onClose()
      }
    })
  }

  return (
<div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Reset Password</h2>
          <p className="text-xs text-slate-500">untuk user <span className="font-semibold">{user.username}</span></p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Kembali
        </button>
      </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

          <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Password Baru</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            required
            minLength={6}
            autoFocus
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? "Menyimpan..." : "Reset"}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Modal edit akun - ubah username & nama lengkap user yang sudah ada
// Inline form edit akun - ubah username & nama lengkap user yang sudah ada
function EditUserForm({ user, onClose, onResult }: { user: UserProfile; onClose: () => void; onResult: (msg: string, type: "success" | "error") => void }) {
  const formRef = useScrollToForm<HTMLDivElement>()
  const [username, setUsername] = useState(user.username)
  const [namaLengkap, setNamaLengkap] = useState(user.nama_lengkap || "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const usernameChanged = username.trim() !== user.username

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await updateUserProfile({
        userId: user.id,
        newUsername: username,
        newNamaLengkap: namaLengkap,
      })
      if (result.error) {
        setError(result.error)
      } else {
        onResult(`Akun ${user.username} berhasil diperbarui`, "success")
        onClose()
      }
    })
  }

  return (
    <div ref={formRef} className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900">Edit Akun</h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Kembali
        </button>
      </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

          <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Username</label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="misal: kasir2"
            required
            autoFocus
          />
          <p className="text-xs text-slate-400">Huruf, angka, underscore saja. Tanpa spasi atau @.</p>
          {usernameChanged && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1.5">
              Username dipakai untuk login. Kalau diganti, user harus pakai username baru ini
              mulai login berikutnya.
            </p>
          )}
        </div>

           <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Nama Lengkap</label>
          <Input
            value={namaLengkap}
            onChange={(e) => setNamaLengkap(e.target.value)}
            placeholder="Opsional"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Modal konfirmasi hapus akun - permanen, selalu tampil sebelum eksekusi
function ConfirmDeleteUserForm({
  user,
  onCancel,
  onConfirm,
  isPending,
}: {
  user: UserProfile
  onCancel: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  const formRef = useScrollToForm<HTMLDivElement>()
  return (
<div ref={formRef} className="bg-white rounded-xl border border-red-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="px-5 py-4 border-b border-red-100 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-red-700">Hapus akun {user.username}?</h2>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Kembali
        </button>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
          </div>
          <div>
            <p className="text-sm text-slate-600">
              Akun ini akan dihapus <span className="font-semibold text-red-600">permanen</span> dan tidak bisa
              login lagi. Tindakan ini tidak bisa dibatalkan.
            </p>
            <p className="text-xs text-slate-400 mt-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
              Kalau user ini pernah punya riwayat transaksi, penghapusan akan otomatis ditolak sistem — pakai
              &quot;Nonaktifkan&quot; sebagai gantinya.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isPending}>
            Batal
          </Button>
          <Button
            type="button"
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Menghapus..." : "Ya, Hapus Permanen"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
      role === "admin"
        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
        : "bg-slate-100 text-slate-600 border border-slate-200"
    }`}>
      {role === "admin" ? "Admin" : "Kasir"}
    </span>
  )
}

function StatusBadge({ aktif }: { aktif: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      aktif
        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
        : "bg-slate-100 text-slate-500 border border-slate-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${aktif ? "bg-emerald-500" : "bg-slate-400"}`} />
      {aktif ? "Aktif" : "Nonaktif"}
    </span>
  )
}

export function UserTable({ data, currentUserId }: { data: UserProfile[]; currentUserId: string }) {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [resetPasswordFor, setResetPasswordFor] = useState<UserProfile | null>(null)
  const [editTarget, setEditTarget] = useState<UserProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null)
  const [isDeletingPending, startDeleteTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    startDeleteTransition(async () => {
      const result = await deleteUser(deleteTarget.id)
      if (result.error) {
        showToast(result.error, "error")
      } else {
        showToast(`Akun ${deleteTarget.username} berhasil dihapus`, "success")
      }
      setDeleteTarget(null)
    })
  }

  const handleRoleChange = (userItem: UserProfile, newRole: string) => {
    setPendingAction(prev => new Set(prev).add(userItem.id))
    startTransition(async () => {
      const result = await updateUserRole(userItem.id, newRole)
      if (result.error) {
        showToast(result.error, "error")
      } else {
        showToast(`Role ${userItem.username} diubah jadi ${newRole}`, "success")
      }
      setPendingAction(prev => {
        const next = new Set(prev)
        next.delete(userItem.id)
        return next
      })
    })
  }

  const handleToggleAktif = (userItem: UserProfile) => {
    setPendingAction(prev => new Set(prev).add(userItem.id))
    startTransition(async () => {
      const result = await toggleAktifUser(userItem.id, !userItem.aktif)
      if (result.error) {
        showToast(result.error, "error")
      } else {
        showToast(
          `${userItem.username} ${!userItem.aktif ? "diaktifkan" : "dinonaktifkan"}`,
          "success"
        )
      }
      setPendingAction(prev => {
        const next = new Set(prev)
        next.delete(userItem.id)
        return next
      })
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowAddModal(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Tambah User
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {data.map((userItem) => {
            const isSelf = userItem.id === currentUserId
            const isPendingThis = pendingAction.has(userItem.id)

            return (
              <div
                key={userItem.id}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 transition-colors ${
                  !userItem.aktif ? "bg-slate-50/50" : "hover:bg-slate-50/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {(userItem.nama_lengkap || userItem.username)[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0 sm:hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900">
                        {userItem.username}
                      </span>
                      {isSelf && (
                        <span className="text-xs text-slate-400">(Anda)</span>
                      )}
                      <RoleBadge role={userItem.role} />
                      <StatusBadge aktif={userItem.aktif} />
                    </div>
                    {userItem.nama_lengkap && (
                      <p className="text-xs text-slate-500 mt-0.5">{userItem.nama_lengkap}</p>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0 hidden sm:block">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-900">
                      {userItem.username}
                    </span>
                    {isSelf && (
                      <span className="text-xs text-slate-400">(Anda)</span>
                    )}
                    <RoleBadge role={userItem.role} />
                    <StatusBadge aktif={userItem.aktif} />
                  </div>
                  {userItem.nama_lengkap && (
                    <p className="text-xs text-slate-500 mt-0.5">{userItem.nama_lengkap}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
                  <select
                    value={userItem.role}
                    onChange={(e) => handleRoleChange(userItem, e.target.value)}
                    disabled={isPendingThis || (isSelf && userItem.role === "admin")}
                    className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="kasir">Kasir</option>
                    <option value="admin">Admin</option>
                  </select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditTarget(userItem)}
                  >
                    Edit
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResetPasswordFor(userItem)}
                  >
                    Reset Password
                  </Button>

                  <Button
                    variant={userItem.aktif ? "outline" : "default"}
                    size="sm"
                    disabled={isPendingThis || isSelf}
                    onClick={() => handleToggleAktif(userItem)}
                    className={userItem.aktif ? "text-red-600 hover:bg-red-50 hover:border-red-200" : ""}
                  >
                    {userItem.aktif ? "Nonaktifkan" : "Aktifkan"}
                  </Button>

                  <button
                    onClick={() => setDeleteTarget(userItem)}
                    disabled={isSelf}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    title={isSelf ? "Tidak bisa menghapus akun sendiri" : "Hapus akun"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            )
          })}

          {data.length === 0 && (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">
              Belum ada user
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddUserForm
          onClose={() => setShowAddModal(false)}
          onResult={showToast}
        />
      )}

      {resetPasswordFor && (
        <ResetPasswordForm
          user={resetPasswordFor}
          onClose={() => setResetPasswordFor(null)}
          onResult={showToast}
        />
      )}

      {editTarget && (
        <EditUserForm
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onResult={showToast}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteUserForm
          user={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          isPending={isDeletingPending}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}