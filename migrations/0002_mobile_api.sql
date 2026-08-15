CREATE TABLE IF NOT EXISTS mobile_sessions (
  id CHAR(32) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  refresh_token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_mobile_sessions_user (user_id),
  INDEX idx_mobile_sessions_expiry (expires_at),
  INDEX idx_mobile_sessions_revoked (revoked_at)
);
