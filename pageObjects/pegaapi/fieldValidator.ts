type RecordValue = Record<string, unknown>;
type ValidationResult = {
  responseTexts: string[];
};

export function validateResponseFields(data: unknown): ValidationResult {
  if (!Array.isArray(data)) {
    throw new Error("Response does not contain a data array.");
  }

  if (data.length === 0) {
    throw new Error("Response data array is empty.");
  }

  const responseTexts: string[] = [];
  let previousTimestamp: number | null = null;

  for (const entry of data) {
    if (!entry || typeof entry !== "object") {
      throw new Error("Response data entry is not an object.");
    }

    const record = entry as RecordValue;
    const message = record.pyMessageKey;
    const timestamp = record.pxTimeCreated;

    if (typeof message !== "string") {
      throw new Error("Each data entry must include pyMessageKey string.");
    }

    if (typeof timestamp !== "string") {
      throw new Error("Each data entry must include pxTimeCreated string.");
    }

    const currentTimestamp = Date.parse(String(timestamp));
    if (Number.isNaN(currentTimestamp)) {
      throw new Error(`Invalid pxTimeCreated value: ${String(timestamp)}`);
    }

    if (previousTimestamp !== null && previousTimestamp < currentTimestamp) {
      throw new Error("Response is not sorted by pxTimeCreated descending.");
    }

    previousTimestamp = currentTimestamp;
    responseTexts.push(String(message));
  }

  return { responseTexts };
}

export function validateExpectedTexts(responseTexts: string[], expectedTexts: string[]): void {
  const missingTexts = expectedTexts.filter((text) => !responseTexts.includes(text));

  if (missingTexts.length > 0) {
    throw new Error(
      `Missing expected pyMessageKey values: ${JSON.stringify(missingTexts)}`
    );
  }
}
