"use client"

import { ReactNode } from "react"
import { MotionConfig as FramerMotionConfig } from "framer-motion"

export function MotionConfig({ children }: { children: ReactNode }) {
  return (
    <FramerMotionConfig
      reducedMotion="user" // Otomatis disable jika user set reduced motion
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
    >
      {children}
    </FramerMotionConfig>
  )
}