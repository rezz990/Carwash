import test from "node:test"
import assert from "node:assert/strict"
import { checkLoginAttempt, clearLoginFailures, loginAttemptKey, recordLoginFailure } from "../src/lib/loginRateLimit"

test("login failures are isolated by normalized username and IP", () => {
  assert.equal(loginAttemptKey(" 127.0.0.1 ", " Admin "), "127.0.0.1:admin")
})

test("fifth failed login blocks the key until its window expires", () => {
  const now = 1_000_000
  const key = `test:${crypto.randomUUID()}`
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(checkLoginAttempt(key, now).allowed, true)
    recordLoginFailure(key, now)
  }
  const blocked = checkLoginAttempt(key, now)
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.retryAfterSeconds > 0)
  assert.equal(checkLoginAttempt(key, now + 15 * 60_000).allowed, true)
  clearLoginFailures(key)
})
