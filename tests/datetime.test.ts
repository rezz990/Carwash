import test from "node:test"
import assert from "node:assert/strict"
import { jakartaDateToUtcSql, utcSqlToIso } from "../src/lib/datetime"

test("Jakarta calendar boundaries are converted to UTC", () => {
  assert.equal(jakartaDateToUtcSql("2026-09-20"), "2026-09-19 17:00:00")
  assert.equal(jakartaDateToUtcSql("2026-09-20", true), "2026-09-20 16:59:59")
})

test("timezone-less database timestamps are treated as UTC", () => {
  assert.equal(utcSqlToIso("2026-09-19 17:00:00"), "2026-09-19T17:00:00Z")
})
