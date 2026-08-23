-- Perbaikan skema activity_logs dari migrasi 0003:
-- Tambah FOREIGN KEY user_id -> users(id) supaya data konsisten,
-- dengan ON DELETE SET NULL supaya user yang dihapus tidak memblokir
-- penghapusan (log lama tetap ada, hanya user_id jadi NULL,
-- sedangkan user_name/user_role tetap tersimpan sebagai snapshot).

ALTER TABLE activity_logs
  ADD CONSTRAINT fk_activity_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
