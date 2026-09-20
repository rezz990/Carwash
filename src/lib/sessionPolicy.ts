export const DEFAULT_LOGIN_TIMEOUT_MINUTES = 60
export const MIN_LOGIN_TIMEOUT_MINUTES = 5
export const MAX_LOGIN_TIMEOUT_MINUTES = 7 * 24 * 60

export type IdleSession = { lastActivity?: unknown; idleTimeoutMinutes?: unknown; error?: unknown }

/** One expiry policy for JWT callbacks, server guards, middleware and browser. */
export function isSessionExpired(session: IdleSession | null | undefined, now = Date.now()): boolean {
  if (!session || session.error) return true
  const { lastActivity, idleTimeoutMinutes } = session
  return typeof lastActivity !== "number" || !Number.isFinite(lastActivity)
    || typeof idleTimeoutMinutes !== "number" || !Number.isInteger(idleTimeoutMinutes)
    || idleTimeoutMinutes < MIN_LOGIN_TIMEOUT_MINUTES || idleTimeoutMinutes > MAX_LOGIN_TIMEOUT_MINUTES
    || lastActivity > now || now - lastActivity >= idleTimeoutMinutes * 60_000
}
