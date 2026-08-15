-- Initial schema for MySQL 8+ / MariaDB 10.4+
-- DATETIME values are stored in UTC. The Next.js app converts WIB <-> UTC.

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nama_lengkap VARCHAR(255) NULL,
  role ENUM('kasir', 'admin') NOT NULL DEFAULT 'kasir',
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jenis_kendaraan (
  id CHAR(36) NOT NULL,
  kategori VARCHAR(50) NOT NULL,
  ukuran VARCHAR(50) NOT NULL,
  tarif_default DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  jatah_karyawan DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  jatah_pemilik DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_jenis_kendaraan_kategori_ukuran (kategori, ukuran),
  CONSTRAINT chk_jenis_kendaraan_split
    CHECK (jatah_karyawan >= 0 AND jatah_pemilik >= 0 AND jatah_karyawan + jatah_pemilik = tarif_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transaksi (
  id CHAR(36) NOT NULL,
  tanggal_waktu DATETIME NOT NULL,
  jenis_kendaraan_id CHAR(36) NOT NULL,
  plat_nomor VARCHAR(50) NULL,
  tarif_total DECIMAL(12,2) NOT NULL,
  tarif_jatah_karyawan DECIMAL(12,2) NOT NULL,
  tarif_jatah_pemilik DECIMAL(12,2) NOT NULL,
  kasir_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_transaksi_tanggal (tanggal_waktu),
  KEY idx_transaksi_jenis (jenis_kendaraan_id),
  KEY idx_transaksi_kasir (kasir_id),
  CONSTRAINT fk_transaksi_jenis
    FOREIGN KEY (jenis_kendaraan_id) REFERENCES jenis_kendaraan(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_transaksi_kasir
    FOREIGN KEY (kasir_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_transaksi_split
    CHECK (tarif_jatah_karyawan >= 0 AND tarif_jatah_pemilik >= 0 AND tarif_jatah_karyawan + tarif_jatah_pemilik = tarif_total)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO jenis_kendaraan
  (id, kategori, ukuran, tarif_default, jatah_karyawan, jatah_pemilik, aktif)
VALUES
  (UUID(), 'Motor', 'Kecil', 15000.00, 7000.00, 8000.00, 1),
  (UUID(), 'Motor', 'Besar', 20000.00, 7000.00, 13000.00, 1),
  (UUID(), 'Mobil', 'Kecil', 30000.00, 13000.00, 17000.00, 1),
  (UUID(), 'Mobil', 'Sedang', 35000.00, 13000.00, 22000.00, 1),
  (UUID(), 'Mobil', 'Besar', 40000.00, 15000.00, 25000.00, 1)
ON DUPLICATE KEY UPDATE
  tarif_default = VALUES(tarif_default),
  jatah_karyawan = VALUES(jatah_karyawan),
  jatah_pemilik = VALUES(jatah_pemilik);
