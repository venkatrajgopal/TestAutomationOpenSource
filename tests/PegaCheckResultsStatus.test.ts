import { test, expect } from "@playwright/test";
import { config } from "dotenv";
import { fetchCaseActions } from "../pageObjects/pegaapi/caseApiService.js";

config({ override: true });

test("Check results status", async ({ request }) => {
  const results = await fetchCaseActions(request);
  
  // Verify status is not empty
  expect(results.status).toBeTruthy();
  expect(typeof results.status).toBe("string");
  
  console.log("API Status:", results.status);
});
