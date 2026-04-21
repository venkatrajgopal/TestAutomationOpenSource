import type { APIRequestContext } from "@playwright/test";

const ENV_USERNAME = "PegaUserName";
const ENV_PASSWORD = "PASSWORD";
const ENV_CASE_API_BASE_URL = "CASE_API_BASE_URL";
const ENV_CASE_INSTANCE_KEY = "CASE_INSTANCE_KEY";

type RecordValue = Record<string, unknown>;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function buildCaseUrl(baseUrl: string, caseInstanceKey: string): string {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const normalizedCaseInstanceKey = caseInstanceKey.replace(/^\/+/, "");
  return `${trimmedBase}/${normalizedCaseInstanceKey}`;
}

function getBasicAuthHeader(username: string, password: string): string {
  const raw = `${username}:${password}`;
  const encoded = Buffer.from(raw).toString("base64");
  return `Basic ${encoded}`;
}

function resolveCaseInstanceKey(caseInstanceKey?: string): string {
  if (caseInstanceKey && caseInstanceKey.trim().length > 0) {
    return caseInstanceKey.trim();
  }

  return requiredEnv(ENV_CASE_INSTANCE_KEY);
}

async function parseJsonResponse(responseText: string): Promise<RecordValue> {
  try {
    return JSON.parse(responseText) as RecordValue;
  } catch {
    throw new Error("Case API response is not valid JSON.");
  }
}

export async function fetchCaseActions(
  request: APIRequestContext,
  caseInstanceKey?: string
): Promise<RecordValue> {
  const baseUrl = requiredEnv(ENV_CASE_API_BASE_URL);
  const username = requiredEnv(ENV_USERNAME);
  const password = requiredEnv(ENV_PASSWORD);
  const resolvedCaseInstanceKey = resolveCaseInstanceKey(caseInstanceKey);
  const url = buildCaseUrl(baseUrl, resolvedCaseInstanceKey);
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

  const payload = await parseJsonResponse(responseText);
  return payload;
}
