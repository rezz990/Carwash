-- Versi sesi memungkinkan reset password mencabut JWT web lama.
SET @session_version_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'session_version'
);

SET @add_session_version = IF(
  @session_version_exists = 0,
  'ALTER TABLE users ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 1 AFTER aktif',
  'SELECT 1'
);

PREPARE add_session_version_statement FROM @add_session_version;
EXECUTE add_session_version_statement;
DEALLOCATE PREPARE add_session_version_statement;
