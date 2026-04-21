import { test, expect } from "@playwright/test";
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fetchAndMapDecisionResult } from "../pageObjects/pegaapi/decisionResultMapper.js";

config({ override: true });

type DecisionContext = {
  decisionID: string;
  runId: string;
};

function readDecisionContext(): DecisionContext {
  const contextPath = path.join(process.cwd(), "testResult", "decisionContext.json");
  if (!existsSync(contextPath)) {
    throw new Error("Missing decision context. Run tests/testResultSTAAppender.test.ts first.");
  }

  const raw = readFileSync(contextPath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<DecisionContext>;
  if (!parsed.decisionID || parsed.decisionID.trim().length === 0) {
    throw new Error("decisionContext.json does not contain a valid decisionID.");
  }

  return {
    decisionID: parsed.decisionID,
    runId: parsed.runId ?? ""
  };
}

test("Map API status and validate decision row status", async ({ request }) => {
  const context = readDecisionContext();

  const { caseInstanceKey, updatedEntry } = await fetchAndMapDecisionResult(
    request,
    context.decisionID
  );

  console.log("Decision ID:", context.decisionID);
  console.log("Case instance key:", caseInstanceKey);
  console.log("Mapped status:", updatedEntry.status);
  console.log("Mapped SupportTypeName:", updatedEntry.SupportTypeName);
  console.log("Mapped CaseStatus:", updatedEntry.CaseStatus);
  console.log("Mapped AvropBusinessCaseId:", updatedEntry.AvropBusinessCaseId);

  expect(updatedEntry.status).toBeTruthy();
  expect(typeof updatedEntry.status).toBe("string");
  expect(updatedEntry.SupportTypeName).toBeTruthy();
  expect(typeof updatedEntry.SupportTypeName).toBe("string");
  expect(updatedEntry.CaseStatus).toBeTruthy();
  expect(typeof updatedEntry.CaseStatus).toBe("string");
  expect(updatedEntry.AvropBusinessCaseId).toBeTruthy();
  expect(typeof updatedEntry.AvropBusinessCaseId).toBe("string");
});
