import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type TestResultEntry = {
  testName: string;
  personnr: string;
  referenceWorkerID: string;
  errandNumber: string;
  kaNumberValue: string;
  name: string;
  workerId: string;
  runId: string;
  timestamp: string;
  decisionID: string;
};

const defaultResultPath = path.join(process.cwd(), "testResult", "testResultSTA.json");

function generateDecisionID(): string {
  // Generate a random 5-digit number (10000-99999)
  const randomNumber = Math.floor(Math.random() * 90000) + 10000;
  return `BOI-${randomNumber}`;
}

function resolveDecisionID(decisionID?: string): string {
  if (decisionID && decisionID.trim().length > 0) {
    return decisionID.trim();
  }

  return generateDecisionID();
}

function readExistingResults(filePath: string): TestResultEntry[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const raw = readFileSync(filePath, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("testResultSTA.json must contain an array.");
    }
    return parsed as TestResultEntry[];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to parse testResultSTA.json: ${message}`);
  }
}

export function appendTestResult(
  testName: string,
  personnr: string,
  referenceWorkerID: string,
  errandNumber: string,
  kaNumberValue: string,
  name: string,
  workerId: string,
  runId: string,
  timestamp: string,
  options?: { filePath?: string; decisionID?: string }
): TestResultEntry {
  const filePath = options?.filePath ?? defaultResultPath;
  
  const entry: TestResultEntry = {
    testName,
    personnr,
    referenceWorkerID,
    errandNumber,
    kaNumberValue,
    name,
    workerId,
    runId,
    timestamp,
    decisionID: resolveDecisionID(options?.decisionID)
  };

  const entries = readExistingResults(filePath);
  const existingIndex = entries.findIndex((value) => value.decisionID === entry.decisionID);
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }

  writeFileSync(filePath, JSON.stringify(entries, null, 2), "utf-8");
  return entry;
}
