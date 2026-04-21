import { test, expect } from "@playwright/test";
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { appendTestResult } from "../pageObjects/pegaapi/testResultSTAAppender.js";

config({ override: true });

test("Append test result with auto-generated decisionID", async () => {
  const decisionID = "T-7";
  const result = appendTestResult(
    "Rusta och matcha 2 (ROM2)",
    "19700324-3255",
    "300025094",
    "EXC-18053",
    "10013013",
    "Kalle Karlsson",
    "0",
    `run-${Date.now()}`,
    new Date().toISOString(),
    { decisionID }
  );

  const contextPath = path.join(process.cwd(), "testResult", "decisionContext.json");
  writeFileSync(
    contextPath,
    JSON.stringify({ decisionID: result.decisionID, runId: result.runId }, null, 2),
    "utf-8"
  );

  // Check that decisionID is not empty
  expect(result.decisionID).toBeTruthy();
  expect(result.decisionID).toBe(decisionID);

  // Verify all other fields are present
  expect(result.testName).toBe("Rusta och matcha 2 (ROM2)");
  expect(result.personnr).toBe("19700324-3255");
  expect(result.referenceWorkerID).toBe("300025094");
  expect(result.errandNumber).toBe("EXC-18053");
  expect(result.kaNumberValue).toBe("10013013");
  expect(result.name).toBe("Kalle Karlsson");
  expect(result.workerId).toBe("0");
  expect(result.runId).toMatch(/^run-\d+$/);
  expect(result.timestamp).toBeTruthy();

  console.log("Generated decisionID:", result.decisionID);
});
