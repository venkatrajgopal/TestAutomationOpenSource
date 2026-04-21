import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { APIRequestContext } from "@playwright/test";
import { fetchCaseActions } from "./caseApiService.js";
import { buildCaseInstanceKey } from "./caseInstanceKeyResolver.js";

type RecordValue = Record<string, unknown>;

type TestResultEntry = Record<string, unknown> & {
  decisionID?: string;
};

type FieldMapping = {
  sourcePath: string;
  targetField: string;
};

const defaultResultPath = path.join(process.cwd(), "testResult", "testResultSTA.json");

const defaultMappings: FieldMapping[] = [
  {
    sourcePath: "status",
    targetField: "status"
  },
  {
    sourcePath: "content.SupportType.Name",
    targetField: "SupportTypeName"
  },
  {
    sourcePath: "content.CaseDetails.caseStatus",
    targetField: "CaseStatus"
  },
  {
    sourcePath: "content.CaseDetails.AvropList(1).AvropBusinessCaseId",
    targetField: "AvropBusinessCaseId"
  }
];

function getIndexedAccessToken(part: string): { key: string; index?: number } {
  const match = /^(\w+)(?:\((\d+)\)|\[(\d+)\])?$/.exec(part);
  if (!match) {
    return { key: part };
  }

  const key = match[1];
  const indexText = match[2] ?? match[3];
  if (!indexText) {
    return { key };
  }

  // Path syntax uses 1-based index, e.g. AvropList(1).
  const index = Number(indexText) - 1;
  return { key, index };
}

function getValueByPath(data: RecordValue, sourcePath: string): unknown {
  const parts = sourcePath.split(".").filter((part) => part.length > 0);
  let current: unknown = data;

  for (const part of parts) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    const access = getIndexedAccessToken(part);
    const value = (current as Record<string, unknown>)[access.key];
    if (typeof access.index !== "number") {
      current = value;
      continue;
    }

    if (!Array.isArray(value) || access.index < 0 || access.index >= value.length) {
      return undefined;
    }

    current = value[access.index];
  }

  return current;
}

function readEntries(filePath: string): TestResultEntry[] {
  if (!existsSync(filePath)) {
    throw new Error(`Result file not found: ${filePath}`);
  }

  const raw = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("testResultSTA.json must contain an array.");
  }

  return parsed as TestResultEntry[];
}

function writeEntries(filePath: string, entries: TestResultEntry[]): void {
  writeFileSync(filePath, JSON.stringify(entries, null, 2), "utf-8");
}

export function mapApiResultToDecisionRow(
  decisionID: string,
  payload: RecordValue,
  options?: { filePath?: string; mappings?: FieldMapping[] }
): TestResultEntry {
  const filePath = options?.filePath ?? defaultResultPath;
  const mappings = options?.mappings ?? defaultMappings;
  const entries = readEntries(filePath);

  const index = entries.findIndex((entry) => entry.decisionID === decisionID);
  if (index < 0) {
    throw new Error(`No row found in testResultSTA.json for decisionID: ${decisionID}`);
  }

  const updatedEntry = { ...entries[index] };
  for (const mapping of mappings) {
    const value = getValueByPath(payload, mapping.sourcePath);
    updatedEntry[mapping.targetField] = value;
  }

  entries[index] = updatedEntry;
  writeEntries(filePath, entries);
  return updatedEntry;
}

export async function fetchAndMapDecisionResult(
  request: APIRequestContext,
  decisionID: string,
  options?: { filePath?: string; mappings?: FieldMapping[] }
): Promise<{ caseInstanceKey: string; payload: RecordValue; updatedEntry: TestResultEntry }> {
  const caseInstanceKey = buildCaseInstanceKey(decisionID);
  const payload = await fetchCaseActions(request, caseInstanceKey);
  const updatedEntry = mapApiResultToDecisionRow(decisionID, payload, options);

  return {
    caseInstanceKey,
    payload,
    updatedEntry
  };
}

export type { FieldMapping, TestResultEntry };
