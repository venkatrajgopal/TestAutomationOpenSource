import { test } from "@playwright/test";
import { config } from "dotenv";
import { fetchCaseActions } from "../pageObjects/pegaapi/caseApiService.js";
import { appendActionsOutput } from "../pageObjects/pegaapi/actionsFileStore.js";

config({ override: true });

test("Append Pega case actions", async ({ request }) => {
  const results = await fetchCaseActions(request);
  appendActionsOutput(results);
});
