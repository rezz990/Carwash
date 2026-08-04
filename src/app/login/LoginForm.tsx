"use client"

import { useState, useTransition } from "react"
import { login } from "../actions"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <form action={onSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl text-center">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none text-slate-300">Username</label>
        <Input 
          id="username" 
          name="username" 
          type="text" 
          required 
          className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
          placeholder="admin" 
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none text-slate-300">Password</label>
        <Input 
          id="password" 
          name="password" 
          type="password" 
          required 
          className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
          placeholder="••••••••" 
        />
      </div>
      <Button disabled={pending} type="submit" className="w-full h-12 text-base font-semibold bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/25 border-0 text-white">
        {pending ? "Memeriksa..." : "Masuk"}
      </Button>
    </form>
  )
}
