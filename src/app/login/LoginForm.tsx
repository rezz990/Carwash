"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useToast } from "@/components/toast/ToastProvider"
import { Loader2, LogIn, Eye, EyeOff, User, Lock } from "lucide-react"

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { addToast } = useToast()

  async function onSubmit(formData: FormData) {
    setError(null)
    setPending(true)
    
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    try {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
      })

      if (res?.error) {
        if (res.error === "Akun dinonaktifkan") {
          setError("Akun Anda telah dinonaktifkan.")
        } else {
          setError("Username atau password salah.")
        }
        addToast("Gagal masuk. Periksa kredensial Anda.", "error")
      } else {
        addToast("Berhasil masuk! Selamat datang kembali.", "success")
        router.push("/admin")
        router.refresh()
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem.")
      addToast("Terjadi kesalahan sistem.", "error")
    } finally {
      setPending(false)
    }
  }

  return (
    <motion.form 
      action={onSubmit} 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
    >
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl text-center"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none text-slate-300">Username</label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            id="username" 
            name="username" 
            type="text" 
            required 
            className="h-12 bg-white/[0.04] border-white/15 text-white placeholder:text-slate-500 pl-10 rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 focus-visible:border-indigo-500/50 hover:border-white/25 transition-all"
            placeholder="Masukkan username" 
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none text-slate-300">Password</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            id="password" 
            name="password" 
            type={showPassword ? "text" : "password"}
            required 
            className="h-12 bg-white/[0.04] border-white/15 text-white placeholder:text-slate-500 pl-10 pr-11 rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 focus-visible:border-indigo-500/50 hover:border-white/25 transition-all"
            placeholder="Masukkan password" 
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
        <Button disabled={pending} type="submit" className="w-full h-12 text-base font-semibold bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/25 border-0 text-white">
          {pending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memeriksa...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LogIn className="w-4 h-4" />
              Masuk
            </span>
          )}
        </Button>
      </motion.div>
    </motion.form>
  )
}