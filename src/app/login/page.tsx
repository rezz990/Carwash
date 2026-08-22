"use client"

import { motion } from "framer-motion"
import { Dancing_Script } from "next/font/google"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { LoginForm } from "./LoginForm"

const dancingScript = Dancing_Script({ subsets: ["latin"], weight: ["700"] })

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-3 sm:p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1] 
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500 rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.08, 0.12, 0.08] 
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500 rounded-full blur-[100px] pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-2xl shadow-2xl relative z-10 text-white">
          <CardHeader className="space-y-2 text-center pb-6 sm:pb-8 pt-6 sm:pt-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
              className="w-14 h-14 sm:w-16 sm:h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner"
            >
              <span className="text-2xl sm:text-3xl font-bold text-black">B</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <CardTitle className={`${dancingScript.className} text-4xl sm:text-5xl tracking-tight text-white`}>Bujon</CardTitle>
            </motion.div>
          </CardHeader>
          <CardContent className="pb-6 sm:pb-8">
            <LoginForm />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}