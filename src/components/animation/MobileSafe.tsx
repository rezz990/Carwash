"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ReactNode } from "react"

// FadeIn yang otomatis disable di perangkat low-power
export function FadeInSafe({ 
  children, 
  delay = 0, 
  className = "" 
}: { 
  children: ReactNode; 
  delay?: number; 
  className?: string 
}) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay,
        // Lebih cepat di mobile untuk feels snappy
        type: "tween",
        ease: "easeOut"
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Hover effect yang aman untuk touch device
export function TouchSafeHover({ 
  children, 
  className = "" 
}: { 
  children: ReactNode; 
  className?: string 
}) {
  const shouldReduceMotion = useReducedMotion()

  // Di touch device, hover tidak ada — gunakan tap instead
  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Stagger yang lebih cepat di mobile
export function StaggerSafe({ 
  children, 
  className = "" 
}: { 
  children: ReactNode; 
  className?: string 
}) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { 
            staggerChildren: 0.08, // Lebih cepat agar tidak terasa lama
            delayChildren: 0.1
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}