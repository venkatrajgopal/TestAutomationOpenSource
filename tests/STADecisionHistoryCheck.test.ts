import { test } from "@playwright/test";
import { config } from "dotenv";
import path from "node:path";
import { fetchHistoryData } from "../pageObjects/pegaapi/historyApiService.js";
import {
  validateExpectedTexts,
  validateResponseFields
} from "../pageObjects/pegaapi/fieldValidator.js";
import { validateSequence } from "../pageObjects/pegaapi/sequenceValidator.js";
import { loadExpectedEntries } from "../pageObjects/pegaapi/testDataLoader.js";

config();

type RecordValue = Record<string, unknown>;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function resolveTestDataPath(): string {
  const envPath = process.env.TEST_DATA_PATH;
  if (!envPath || envPath.trim().length === 0) {
    return path.join(process.cwd(), "testData", "testData.json");
  }

  return path.isAbsolute(envPath)
    ? envPath
    : path.join(process.cwd(), envPath);
}

test("STA Decision History Check", async ({ request }) => {
  const dataPath = resolveTestDataPath();
  const expectedEntries = loadExpectedEntries(dataPath);
  const caseInstanceKey = required("CaseInstanceKey");

  const requestBody: RecordValue = {
    dataViewParameters: {
      CaseInstanceKey: caseInstanceKey
    }
  };

  const response = await fetchHistoryData(request, requestBody);

  const { responseTexts } = validateResponseFields(response.data);
  const expectedTexts = expectedEntries.map((entry) => entry.text);

  validateExpectedTexts(responseTexts, expectedTexts);
  validateSequence(responseTexts, expectedEntries);
});
