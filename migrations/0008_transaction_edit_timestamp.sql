-- Penanda versi untuk koreksi transaksi dan optimistic concurrency control.
-- Prepared statement menjaga migrasi aman pada instalasi lama yang kolomnya
-- mungkin sudah pernah ditambahkan secara manual.
SET @edited_at_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'transaksi'
    AND COLUMN_NAME = 'edited_at'
);

SET @add_edited_at = IF(
  @edited_at_exists = 0,
  'ALTER TABLE transaksi ADD COLUMN edited_at DATETIME(6) NULL AFTER created_at',
  'SELECT 1'
);

PREPARE add_edited_at_statement FROM @add_edited_at;
EXECUTE add_edited_at_statement;
DEALLOCATE PREPARE add_edited_at_statement;

ALTER TABLE transaksi MODIFY edited_at DATETIME(6) NULL;
