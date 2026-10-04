-- Instalasi awal: tambah kolom edited_at (DATETIME).
-- File 0008_transaction_edit_timestamp.sql menyusul untuk DATETIME(6) dan
-- membuat penambahan kolom aman jika kolom ini sudah ada.
ALTER TABLE transaksi
ADD COLUMN edited_at DATETIME NULL AFTER created_at;