"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/Button"
import { Home, Search, AlertTriangle } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-100"
        >
          <Search className="w-12 h-12 text-amber-500" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-6xl font-bold text-slate-900 mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-slate-700 mb-4">Halaman Tidak Ditemukan</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Maaf, halaman yang Anda cari tidak dapat ditemukan. Mungkin halaman telah dipindahkan atau URL yang Anda masukkan salah.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link href="/admin">
            <Button className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Kembali ke Dashboard
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="w-full sm:w-auto">
              Halaman Login
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}