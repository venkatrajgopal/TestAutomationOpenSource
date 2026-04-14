import type { APIRequestContext } from "@playwright/test";

const ENV_USERNAME = "PegaUserName";
const ENV_PASSWORD = "PASSWORD";
const ENV_CASE_API_BASE_URL = "CASE_API_BASE_URL";
const ENV_CASE_ID = "CASE_ID";

type RecordValue = Record<string, unknown>;

type CaseAction = {
  name?: string;
  ID?: string;
  id?: string;
};

export type CaseActionResult = {
  name: string;
  ID: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function buildCaseUrl(baseUrl: string, caseId: string): string {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const encodedCaseId = encodeURIComponent(caseId);
  return `${trimmedBase}/${encodedCaseId}`;
}

function normalizeCaseId(caseId?: string): string {
  if (caseId && caseId.trim().length > 0) {
    return caseId;
  }

  return requiredEnv(ENV_CASE_ID);
}

function getBasicAuthHeader(username: string, password: string): string {
  const raw = `${username}:${password}`;
  const encoded = Buffer.from(raw).toString("base64");
  return `Basic ${encoded}`;
}

function extractActionResults(payload: RecordValue): CaseActionResult[] {
  const actions = payload.actions;
  if (!Array.isArray(actions)) {
    throw new Error("API response does not contain an actions array.");
  }

  return actions.map((action, index) => {
    if (!action || typeof action !== "object") {
      throw new Error(`Invalid action at index ${index}.`);
    }

    const value = action as CaseAction;
    if (typeof value.name !== "string" || value.name.trim().length === 0) {
      throw new Error(`Action at index ${index} is missing a valid name.`);
    }

    const idValue = typeof value.ID === "string" && value.ID.trim().length > 0
      ? value.ID
      : typeof value.id === "string" && value.id.trim().length > 0
        ? value.id
        : "";

    if (idValue.length === 0) {
      throw new Error(`Action at index ${index} is missing a valid ID.`);
    }

    return {
      name: value.name,
      ID: idValue
    };
  });
}

export async function fetchCaseActions(
  request: APIRequestContext,
  caseId?: string
): Promise<CaseActionResult[]> {
  const baseUrl = requiredEnv(ENV_CASE_API_BASE_URL);
  const username = requiredEnv(ENV_USERNAME);
  const password = requiredEnv(ENV_PASSWORD);
  const resolvedCaseId = normalizeCaseId(caseId);
  const url = buildCaseUrl(baseUrl, resolvedCaseId);
  const authHeader = getBasicAuthHeader(username, password);

  const response = await request.get(url, {
    headers: {
      Authorization: authHeader,
      Accept: "application/json"
    }
  });

  const responseText = await response.text();
  if (!response.ok()) {
    throw new Error(`Case API request failed (${response.status()}): ${responseText}`);
  }

  const payload = JSON.parse(responseText) as RecordValue;
  return extractActionResults(payload);
}
