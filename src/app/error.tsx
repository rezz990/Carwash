"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/Button"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error ke monitoring service (Sentry, LogRocket, dll)
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-lg">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100"
        >
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Terjadi Kesalahan</h1>
          <p className="text-slate-500 mb-2 leading-relaxed">
            Maaf, aplikasi mengalami masalah saat memproses permintaan Anda.
          </p>
          {error.digest && (
            <p className="text-xs text-slate-400 font-mono bg-slate-100 px-3 py-1 rounded-lg inline-block mb-6">
              Error ID: {error.digest}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button onClick={reset} className="w-full sm:w-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
          <Link href="/admin">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}