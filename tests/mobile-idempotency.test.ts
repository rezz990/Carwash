import assert from "node:assert/strict";
import test from "node:test";

import {
  hasClientTransactionId,
  isDuplicateKeyError,
  isNoPlatePlaceholder,
  parseClientTransactionId,
} from "../src/lib/mobile/idempotency";

test("client transaction ID accepts and normalizes UUID", () => {
  assert.equal(
    parseClientTransactionId("550E8400-E29B-41D4-A716-446655440000"),
    "550e8400-e29b-41d4-a716-446655440000",
  );
});

test("client transaction ID keeps old clients backward compatible", () => {
  assert.equal(hasClientTransactionId(undefined), false);
  assert.equal(parseClientTransactionId(undefined), null);
});

test("invalid supplied client transaction ID is rejected", () => {
  assert.equal(hasClientTransactionId("offline-1234"), true);
  assert.equal(parseClientTransactionId("offline-1234"), null);
});

test("duplicate key errors are recognized safely", () => {
  assert.equal(isDuplicateKeyError({ code: "ER_DUP_ENTRY" }), true);
  assert.equal(isDuplicateKeyError(new Error("other")), false);
});

test("no-plate placeholder bypasses real plate duplicate checks", () => {
  assert.equal(isNoPlatePlaceholder("B0000XX"), true);
  assert.equal(isNoPlatePlaceholder("B1234XYZ"), false);
});
