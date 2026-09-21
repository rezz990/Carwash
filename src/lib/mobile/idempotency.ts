const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const NO_PLATE_PLACEHOLDER = "B0000XX";

export function parseClientTransactionId(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;

  const normalized = String(value).trim();
  return UUID_PATTERN.test(normalized) ? normalized.toLowerCase() : null;
}

export function hasClientTransactionId(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export function isNoPlatePlaceholder(plate: string): boolean {
  return plate === NO_PLATE_PLACEHOLDER;
}

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  );
}
