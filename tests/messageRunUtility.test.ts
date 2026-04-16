import { test, expect } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  fetchParsePersistLogRun,
  getStoredRun,
  type StoredLogRun
} from "../pageObjects/pegaapi/messageRunUtility.js";

test("fetches, parses, persists, and retrieves a log run by runId", async ({ request }) => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "message-run-utility-"));
  const filePath = path.join(tempDir, "runs.json");

  const requestBody = {
    query: {
      match_phrase: {
        message: "PagenameTest12"
      }
    }
  };

  const runId = await fetchParsePersistLogRun(request, requestBody, { filePath });

  expect(runId).toBeTruthy();

  const storedRun = getStoredRun(runId, filePath) as StoredLogRun | undefined;
  expect(storedRun).toBeDefined();
  expect(storedRun?.runId).toBe(runId);
  expect(storedRun?.timestamp).toBeTruthy();
  expect(Array.isArray(storedRun?.messages)).toBe(true);
  expect(storedRun?.messages.length).toBeGreaterThan(0);

  const firstMessage = storedRun?.messages[0];
  expect(firstMessage?.pageName).toBe("PageNameTest12");
  expect(firstMessage?.requestBody).toBeTruthy();
  expect(firstMessage?.responseBody).toBeTruthy();
});