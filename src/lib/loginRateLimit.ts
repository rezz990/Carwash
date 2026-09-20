const WINDOW_MS = 15 * 60_000
const MAX_FAILURES = 5
const MAX_KEYS = 10_000

type Attempt = { failures: number; resetAt: number }
const globalRateLimit = globalThis as typeof globalThis & { carwashLoginAttempts?: Map<string, Attempt> }
const attempts = globalRateLimit.carwashLoginAttempts ??= new Map<string, Attempt>()

export function loginAttemptKey(ip: string | undefined, username: string): string {
  return `${ip?.trim() || "unknown"}:${username.trim().toLowerCase()}`
}

export function checkLoginAttempt(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
  const entry = attempts.get(key)
  if (!entry || entry.resetAt <= now) {
    if (entry) attempts.delete(key)
    return { allowed: true, retryAfterSeconds: 0 }
  }
  return entry.failures >= MAX_FAILURES
    ? { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1_000) }
    : { allowed: true, retryAfterSeconds: 0 }
}

export function recordLoginFailure(key: string, now = Date.now()): void {
  if (attempts.size >= MAX_KEYS) {
    for (const [storedKey, entry] of attempts) {
      if (entry.resetAt <= now) attempts.delete(storedKey)
    }
    if (attempts.size >= MAX_KEYS) attempts.delete(attempts.keys().next().value as string)
  }
  const current = attempts.get(key)
  attempts.set(key, current && current.resetAt > now
    ? { ...current, failures: current.failures + 1 }
    : { failures: 1, resetAt: now + WINDOW_MS })
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key)
}
