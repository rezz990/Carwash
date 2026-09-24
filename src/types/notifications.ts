export type NewTransactionEvent = {
  id: string
  tanggalWaktu: string
  platNomor: string | null
  tarif: number
  jatahKaryawan: number
  jatahPemilik: number
  jenisKendaraan: { id: string; kategori: string; ukuran: string }
  kasir: { username: string; namaLengkap: string | null }
}
