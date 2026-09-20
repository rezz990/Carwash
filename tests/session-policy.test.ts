import test from "node:test"
import assert from "node:assert/strict"
import { isSessionExpired } from "../src/lib/sessionPolicy"

test("session remains valid before the idle boundary", () => {
  const now = 2_000_000
  assert.equal(isSessionExpired({ lastActivity: now - 299_999, idleTimeoutMinutes: 5 }, now), false)
})

test("session expires exactly at the idle boundary", () => {
  const now = 2_000_000
  assert.equal(isSessionExpired({ lastActivity: now - 300_000, idleTimeoutMinutes: 5 }, now), true)
})

test("invalid, future, and explicitly errored sessions fail closed", () => {
  const now = 2_000_000
  assert.equal(isSessionExpired(undefined, now), true)
  assert.equal(isSessionExpired({ lastActivity: now + 1, idleTimeoutMinutes: 60 }, now), true)
  assert.equal(isSessionExpired({ lastActivity: now, idleTimeoutMinutes: 0 }, now), true)
  assert.equal(isSessionExpired({ lastActivity: now, idleTimeoutMinutes: 60, error: "SessionExpired" }, now), true)
})
