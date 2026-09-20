import { NextResponse } from "next/server"
import pool from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await pool.query("SELECT 1")
    return NextResponse.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() }, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    console.error("Health check database error:", error)
    return NextResponse.json({ status: "degraded", database: "unavailable", timestamp: new Date().toISOString() }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    })
  }
}
