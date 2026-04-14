import type { APIRequestContext } from "@playwright/test";
import { getAccessToken } from "./pegaOAuthService.js";

type RecordValue = Record<string, unknown>;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function fetchHistoryData(
  request: APIRequestContext,
  requestBody: RecordValue
): Promise<RecordValue> {
  const tokenUrl = required("OAUTH_TOKEN_URL");
  const clientId = required("OAUTH_CLIENT_ID");
  const clientSecret = required("OAUTH_CLIENT_SECRET");
  const mainApiUrl = required("MAIN_API_URL");

  const bearerToken = await getAccessToken(request, tokenUrl, clientId, clientSecret);

  const response = await request.post(mainApiUrl, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`
    },
    data: requestBody
  });

  const responseText = await response.text();
  if (!response.ok()) {
    throw new Error(`Main API request failed (${response.status()}): ${responseText}`);
  }

  return JSON.parse(responseText) as RecordValue;
}
