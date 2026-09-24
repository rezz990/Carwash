"use client"

import { useMemo, useState, useTransition } from "react"
import { KeyRound, Pencil, Plus, Power, Search, ShieldCheck, Trash2, UserRound } from "lucide-react"
import { useToast } from "@/components/toast/ToastProvider"
import { Button } from "@/components/ui/Button"
import { ErrorNotice } from "@/components/ui/Feedback"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { createUser, deleteUser, resetPassword, setUserActive, updateUser } from "./actions"
import type { UserProfile } from "./actions"
export type { UserProfile } from "./actions"

function UserForm({ user, currentUserId, onClose, onSaved }: {
  user?: UserProfile
  currentUserId: string
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [username, setUsername] = useState(user?.username ?? "")
  const [name, setName] = useState(user?.nama_lengkap ?? "")
  const [role, setRole] = useState<"admin" | "kasir">(user?.role ?? "kasir")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    startTransition(async () => {
      try {
        const result = user
          ? await updateUser({ userId: user.id, username, namaLengkap: name, role })
          : await createUser({ username, namaLengkap: name, role, password })
        if (result.error) return setError(result.error)
        onSaved(user ? `Akun ${user.username} diperbarui` : `Akun ${username.trim()} dibuat`)
      } catch {
        setError("Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.")
      }
    })
  }

  const self = user?.id === currentUserId
  return <Modal title={user ? "Edit akun" : "Tambah user"} onClose={onClose} busy={pending} footer={<div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={onClose} disabled={pending}>Batal</Button><Button type="submit" form="user-form" isLoading={pending}>Simpan</Button></div>}>
    <form id="user-form" onSubmit={submit} className="space-y-4">
      {error && <ErrorNotice message={error} />}
      <div><label className="field-label" htmlFor="user-username">Username</label><Input id="user-username" value={username} minLength={3} maxLength={64} autoCapitalize="none" autoCorrect="off" onChange={(event) => setUsername(event.target.value)} placeholder="contoh: kasir_pagi" autoFocus /></div>
      <div><label className="field-label" htmlFor="user-name">Nama lengkap</label><Input id="user-name" value={name} maxLength={255} onChange={(event) => setName(event.target.value)} placeholder="Opsional" /></div>
      {!user && <div><label className="field-label" htmlFor="user-password">Password awal</label><Input id="user-password" type="password" value={password} minLength={8} maxLength={128} autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 8 karakter" /><p className="mt-1.5 text-xs text-slate-500">Berikan password melalui jalur pribadi dan minta user menggantinya.</p></div>}
      <fieldset><legend className="field-label">Hak akses</legend><div className="grid grid-cols-2 gap-2">{([['kasir','Kasir'],['admin','Admin']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={role===value} disabled={self && value !== "admin"} onClick={() => setRole(value)} className={`min-h-12 rounded-xl border-2 px-3 text-sm font-semibold ${role===value ? "border-yellow-400 bg-yellow-50 text-slate-950" : "border-slate-200 text-slate-600"} disabled:opacity-40`}>{label}</button>)}</div></fieldset>
      {self && <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Hak admin akun yang sedang dipakai tidak dapat diturunkan.</p>}
    </form>
  </Modal>
}

function ResetPasswordModal({ user, onClose, onSaved }: { user: UserProfile; onClose: () => void; onSaved: (message: string) => void }) {
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    if (password !== confirmation) return setError("Konfirmasi password tidak sama")
    startTransition(async () => {
      try {
        const result = await resetPassword(user.id, password)
        if (result.error) return setError(result.error)
        onSaved(`Password ${user.username} direset dan semua sesinya dicabut`)
      } catch {
        setError("Password belum berubah. Periksa koneksi lalu coba lagi.")
      }
    })
  }
  return <Modal title={`Reset password ${user.username}`} onClose={onClose} busy={pending} footer={<div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={onClose} disabled={pending}>Batal</Button><Button type="submit" form="reset-password-form" isLoading={pending}>Reset password</Button></div>}>
    <form id="reset-password-form" onSubmit={submit} className="space-y-4">{error && <ErrorNotice message={error} />}<p className="text-sm leading-6 text-slate-600">Semua sesi web dan mobile user ini akan dicabut. User harus login ulang memakai password baru.</p><div><label className="field-label" htmlFor="new-user-password">Password baru</label><Input id="new-user-password" type="password" minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 8 karakter" autoFocus /></div><div><label className="field-label" htmlFor="confirm-user-password">Ulangi password</label><Input id="confirm-user-password" type="password" minLength={8} maxLength={128} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div></form>
  </Modal>
}

export function UserTable({ data, currentUserId, loadError }: { data: UserProfile[]; currentUserId: string; loadError?: string }) {
  const [query, setQuery] = useState("")
  const [editor, setEditor] = useState<UserProfile | "new" | null>(null)
  const [resetTarget, setResetTarget] = useState<UserProfile | null>(null)
  const [statusTarget, setStatusTarget] = useState<UserProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [pending, startTransition] = useTransition()
  const { addToast } = useToast()
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("id-ID")
    return term ? data.filter((user) => `${user.username} ${user.nama_lengkap ?? ""} ${user.role}`.toLocaleLowerCase("id-ID").includes(term)) : data
  }, [data, query])

  function saved(message: string) {
    setEditor(null); setResetTarget(null); addToast(message, "success")
  }

  function applyStatus() {
    if (!statusTarget) return
    const target = statusTarget
    startTransition(async () => {
      try {
        const result = await setUserActive(target.id, !target.aktif)
        if (result.error) addToast(result.error, "error")
        else addToast(`${target.username} ${target.aktif ? "dinonaktifkan" : "diaktifkan"}`, "success")
      } catch { addToast("Status user belum berubah. Coba lagi.", "error") }
      finally { setStatusTarget(null) }
    })
  }

  function removeUser() {
    if (!deleteTarget || deleteConfirmation !== deleteTarget.username) return
    const target = deleteTarget
    startTransition(async () => {
      try {
        const result = await deleteUser(target.id)
        if (result.error) addToast(result.error, "error")
        else addToast(`Akun ${target.username} dihapus`, "success")
      } catch { addToast("Akun belum terhapus. Coba lagi.", "error") }
      finally { setDeleteTarget(null); setDeleteConfirmation("") }
    })
  }

  return <div className="space-y-4">
    {loadError && <ErrorNotice message={loadError} />}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="relative block flex-1 sm:max-w-sm"><span className="sr-only">Cari user</span><Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-10" placeholder="Cari nama atau username" /></label>
      <Button onClick={() => setEditor("new")}><Plus size={18} /> Tambah user</Button>
    </div>

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {filtered.map((user) => {
        const self = user.id === currentUserId
        return <article key={user.id} className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${user.aktif ? "" : "opacity-70"}`}>
          <div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-sm font-bold text-yellow-800">{(user.nama_lengkap || user.username).slice(0,1).toUpperCase()}</span><div className="min-w-0 flex-1"><h2 className="truncate font-bold text-slate-900">{user.nama_lengkap || user.username}</h2><p className="truncate text-sm text-slate-500">@{user.username}{self ? " · akun Anda" : ""}</p><div className="mt-2 flex flex-wrap gap-1.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${user.role === "admin" ? "bg-yellow-50 text-yellow-800" : "bg-slate-100 text-slate-600"}`}>{user.role === "admin" ? "Admin" : "Kasir"}</span><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${user.aktif ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{user.aktif ? "Aktif" : "Nonaktif"}</span></div></div>{user.role === "admin" ? <ShieldCheck size={20} className="shrink-0 text-yellow-700" /> : <UserRound size={20} className="shrink-0 text-slate-400" />}</div>
          <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" size="sm" onClick={() => setEditor(user)}><Pencil size={16} /> Edit</Button><Button variant="outline" size="sm" onClick={() => setResetTarget(user)} disabled={self}><KeyRound size={16} /> Password</Button><Button variant="outline" size="sm" onClick={() => setStatusTarget(user)} disabled={self} className={user.aktif ? "text-red-700" : "text-emerald-700"}><Power size={16} /> {user.aktif ? "Nonaktif" : "Aktifkan"}</Button><Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(user); setDeleteConfirmation("") }} disabled={self} className="text-red-700"><Trash2 size={16} /> Hapus</Button></div>
          {self && <p className="mt-3 text-xs text-slate-500">Ubah password akun Anda melalui menu Pengaturan.</p>}
        </article>
      })}
    </div>
    {!loadError && filtered.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500">{query ? "User tidak ditemukan." : "Belum ada user."}</div>}

    {editor && <UserForm user={editor === "new" ? undefined : editor} currentUserId={currentUserId} onClose={() => setEditor(null)} onSaved={saved} />}
    {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} onSaved={saved} />}
    {statusTarget && <Modal title={statusTarget.aktif ? "Nonaktifkan akun?" : "Aktifkan akun?"} onClose={() => setStatusTarget(null)} busy={pending} footer={<div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => setStatusTarget(null)} disabled={pending}>Batal</Button><Button variant={statusTarget.aktif ? "destructive" : "default"} onClick={applyStatus} isLoading={pending}>{statusTarget.aktif ? "Nonaktifkan" : "Aktifkan"}</Button></div>}><p className="text-sm leading-6 text-slate-600">{statusTarget.aktif ? `Akun ${statusTarget.username} langsung kehilangan akses dan sesi mobilenya dicabut. Histori transaksi tetap tersimpan.` : `Akun ${statusTarget.username} dapat kembali login.`}</p></Modal>}
    {deleteTarget && <Modal title="Hapus akun permanen?" onClose={() => { setDeleteTarget(null); setDeleteConfirmation("") }} busy={pending} footer={<div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={pending}>Batal</Button><Button variant="destructive" onClick={removeUser} disabled={deleteConfirmation !== deleteTarget.username} isLoading={pending}>Hapus akun</Button></div>}><div className="space-y-4"><p className="text-sm leading-6 text-slate-600">Akun hanya dapat dihapus bila belum memiliki transaksi. Untuk akun yang pernah dipakai, gunakan Nonaktifkan.</p><div><label className="field-label" htmlFor="delete-user-confirmation">Ketik <strong>{deleteTarget.username}</strong> untuk mengonfirmasi</label><Input id="delete-user-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoCapitalize="none" autoFocus /></div></div></Modal>}
  </div>
}
