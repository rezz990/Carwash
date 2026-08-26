-- Index untuk query dashboard, rekap, mobile API, dan log ketika data membesar.
-- Index tanggal tunggal lama tetap berguna; kombinasi berikut menghindari scan
-- besar pada filter user/jenis sekaligus rentang waktu.
ALTER TABLE transaksi
  ADD INDEX idx_transaksi_kasir_tanggal (kasir_id, tanggal_waktu),
  ADD INDEX idx_transaksi_jenis_tanggal (jenis_kendaraan_id, tanggal_waktu);

ALTER TABLE activity_logs
  ADD INDEX idx_activity_logs_action_created (action, created_at),
  ADD INDEX idx_activity_logs_entity_created (entity_type, created_at),
  ADD INDEX idx_activity_logs_user_created (user_id, created_at);

-- Presisi mikrodetik memastikan dua request API yang berdekatan tetap tercatat
-- sebagai aktivitas (dan UPDATE tidak dianggap tidak mengubah baris).
ALTER TABLE mobile_sessions
  MODIFY last_activity_at DATETIME(6) NOT NULL DEFAULT (UTC_TIMESTAMP(6));
