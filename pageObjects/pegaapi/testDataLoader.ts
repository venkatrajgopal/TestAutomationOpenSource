import { readFileSync } from "node:fs";

type ExpectedEntry = {
  text: string;
  validateSequence: boolean;
};
type RecordValue = Record<string, unknown>;

export function loadExpectedEntries(dataPath: string): ExpectedEntry[] {
  const raw = readFileSync(dataPath, "utf-8");
  const parsed = JSON.parse(raw) as { expectedEntries?: unknown };

  if (!Array.isArray(parsed.expectedEntries)) {
    throw new Error("testData.json must contain expectedEntries array.");
  }

  const entries = parsed.expectedEntries.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Invalid expected entry at index ${index}.`);
    }

    const value = entry as RecordValue;
    const text = value.text;
    const validateSequence = value.validateSequence;

    if (typeof text !== "string" || text.length === 0) {
      throw new Error(`Expected entry at index ${index} must have non-empty text.`);
    }

    if (typeof validateSequence !== "boolean") {
      throw new Error(`Expected entry at index ${index} must have boolean validateSequence.`);
    }

    return { text, validateSequence };
  });

  if (entries.length === 0) {
    throw new Error("expectedEntries cannot be empty.");
  }

  return entries;
}
