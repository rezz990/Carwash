-- Master petugas cuci + referensi petugas pada transaksi.
-- Satu transaksi mencatat satu petugas (petugas_id). Nullable supaya
-- transaksi lama yang belum punya petugas tetap valid tanpa backfill.
CREATE TABLE IF NOT EXISTS petugas_cuci (
  id CHAR(36) NOT NULL,
  nama VARCHAR(255) NOT NULL,
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_petugas_cuci_nama (nama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @petugas_col_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'transaksi'
    AND COLUMN_NAME = 'petugas_id'
);

SET @add_petugas_col = IF(
  @petugas_col_exists = 0,
  'ALTER TABLE transaksi ADD COLUMN petugas_id CHAR(36) NULL AFTER kasir_id',
  'SELECT 1'
);

PREPARE add_petugas_col_statement FROM @add_petugas_col;
EXECUTE add_petugas_col_statement;
DEALLOCATE PREPARE add_petugas_col_statement;

SET @petugas_index_exists = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'transaksi'
    AND INDEX_NAME = 'idx_transaksi_petugas'
);

SET @add_petugas_index = IF(
  @petugas_index_exists = 0,
  'ALTER TABLE transaksi ADD INDEX idx_transaksi_petugas (petugas_id)',
  'SELECT 1'
);

PREPARE add_petugas_index_statement FROM @add_petugas_index;
EXECUTE add_petugas_index_statement;
DEALLOCATE PREPARE add_petugas_index_statement;

SET @petugas_fk_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'transaksi'
    AND CONSTRAINT_NAME = 'fk_transaksi_petugas'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @add_petugas_fk = IF(
  @petugas_fk_exists = 0,
  'ALTER TABLE transaksi ADD CONSTRAINT fk_transaksi_petugas FOREIGN KEY (petugas_id) REFERENCES petugas_cuci(id) ON UPDATE CASCADE ON DELETE RESTRICT',
  'SELECT 1'
);

PREPARE add_petugas_fk_statement FROM @add_petugas_fk;
EXECUTE add_petugas_fk_statement;
DEALLOCATE PREPARE add_petugas_fk_statement;
