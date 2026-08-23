-- Pastikan timestamp activity log selalu disimpan sebagai UTC, terlepas dari
-- konfigurasi timezone session MySQL/MariaDB. Aplikasi menampilkannya kembali
-- dalam timezone bisnis Asia/Jakarta (WIB).
ALTER TABLE activity_logs
  MODIFY created_at DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP());
