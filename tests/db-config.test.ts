import assert from "node:assert/strict"
import test from "node:test"
import pool from "../src/lib/db"

test("database configuration is checked lazily at first use", () => {
  const original = process.env.DATABASE_URL
  delete process.env.DATABASE_URL

  try {
    assert.throws(() => pool.query("SELECT 1"), /DATABASE_URL belum dikonfigurasi/)
  } finally {
    if (original === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = original
  }
})
