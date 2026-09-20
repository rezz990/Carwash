import test from "node:test"
import assert from "node:assert/strict"
import type { PoolConnection } from "mysql2/promise"
import { insertBackupRows, validateTransactionBackup, type BackupRow } from "../src/lib/transactionBackup"

const sample: BackupRow = {
  id: "11111111-1111-4111-8111-111111111111",
  tanggal_waktu: "2026-09-20T02:30:00.000Z",
  jenis_kendaraan_id: "22222222-2222-4222-8222-222222222222",
  plat_nomor: "B 1234 CD",
  tarif_total: 30_000,
  tarif_jatah_karyawan: 13_000,
  tarif_jatah_pemilik: 17_000,
  kasir_id: "33333333-3333-4333-8333-333333333333",
}

test("backup validation accepts a complete original row", () => {
  assert.deepEqual(validateTransactionBackup([sample]), [sample])
})

test("backup validation rejects broken income splits and IDs", () => {
  assert.throws(() => validateTransactionBackup([{ ...sample, tarif_jatah_pemilik: 1 }]), /Pembagian/)
  assert.throws(() => validateTransactionBackup([{ ...sample, id: "not-an-id" }]), /ID/)
})

test("restore skips existing IDs and commits only new rows", async () => {
  const second = { ...sample, id: "44444444-4444-4444-8444-444444444444" }
  let committed = false
  let rolledBack = false
  const connection = {
    beginTransaction: async () => undefined,
    commit: async () => { committed = true },
    rollback: async () => { rolledBack = true },
    query: async (sql: string) => sql.startsWith("SELECT")
      ? [[{ id: sample.id }], []]
      : [{ affectedRows: 1 }, []],
  } as unknown as PoolConnection
  assert.deepEqual(await insertBackupRows(connection, [sample, second]), { inserted: 1, skipped: 1 })
  assert.equal(committed, true)
  assert.equal(rolledBack, false)
})

test("restore rolls the whole file back when an insert fails", async () => {
  let committed = false
  let rolledBack = false
  const connection = {
    beginTransaction: async () => undefined,
    commit: async () => { committed = true },
    rollback: async () => { rolledBack = true },
    query: async (sql: string) => {
      if (sql.startsWith("SELECT")) return [[], []]
      throw new Error("foreign key")
    },
  } as unknown as PoolConnection
  await assert.rejects(() => insertBackupRows(connection, [sample]), /foreign key/)
  assert.equal(committed, false)
  assert.equal(rolledBack, true)
})
