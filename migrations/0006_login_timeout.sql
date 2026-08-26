-- Timeout sesi dapat diubah admin. Nilai bawaan adalah 60 menit.
CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(100) NOT NULL,
  setting_value VARCHAR(255) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO app_settings (setting_key, setting_value)
VALUES ('login_timeout_minutes', '60')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

ALTER TABLE mobile_sessions
  ADD COLUMN last_activity_at DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()) AFTER created_at,
  ADD INDEX idx_mobile_sessions_last_activity (last_activity_at);
