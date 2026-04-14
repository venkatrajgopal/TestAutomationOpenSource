import { config } from "dotenv";

config();

type RecordValue = Record<string, unknown>;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function getAccessToken(
  tokenUrl: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const form = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: form
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OAuth token request failed (${response.status} ${response.statusText}): ${errorText}`
    );
  }

  const payload = (await response.json()) as RecordValue;
  const token = payload.access_token;

  if (typeof token !== "string" || token.trim().length === 0) {
    throw new Error("OAuth response does not contain a valid access_token.");
  }

  return token;
}

async function invokeMainApi(
  apiUrl: string,
  accessToken: string,
  requestBody: RecordValue
): Promise<RecordValue> {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(requestBody)
  });

  const responseText = await response.text();
  let parsed: RecordValue;

  try {
    parsed = JSON.parse(responseText) as RecordValue;
  } catch {
    throw new Error(`Main API returned non-JSON response: ${responseText}`);
  }

  if (!response.ok) {
    throw new Error(
      `Main API request failed (${response.status} ${response.statusText}): ${responseText}`
    );
  }

  return parsed;
}

function validatePyMessageKey(response: RecordValue): void {
  const data = response.data;
  if (!Array.isArray(data)) {
    throw new Error("Response does not contain a data array.");
  }

  const hasItemCreated = data.some((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    const pyMessageKey = (entry as RecordValue).pyMessageKey;
    if (typeof pyMessageKey !== "string") {
      return false;
    }
    return pyMessageKey.trim().toLowerCase() === "item created.";
  });

  if (!hasItemCreated) {
    const keysPreview = data
      .map((entry) => (entry as RecordValue)?.pyMessageKey)
      .filter((value) => typeof value === "string")
      .slice(0, 10);

    throw new Error(
      `Validation failed: no data entry has pyMessageKey = \"Item created.\". Found values: ${JSON.stringify(
        keysPreview
      )}`
    );
  }
}

async function main(): Promise<void> {
  const tokenUrl = required("OAUTH_TOKEN_URL");
  const clientId = required("OAUTH_CLIENT_ID");
  const clientSecret = required("OAUTH_CLIENT_SECRET");
  const mainApiUrl = required("MAIN_API_URL");
  const requestBodyRaw = required("MAIN_API_REQUEST_BODY");

  let requestBody: RecordValue;
  try {
    requestBody = JSON.parse(requestBodyRaw) as RecordValue;
  } catch {
    throw new Error("MAIN_API_REQUEST_BODY must be valid JSON.");
  }

  const token = await getAccessToken(tokenUrl, clientId, clientSecret);
  const response = await invokeMainApi(mainApiUrl, token, requestBody);
  validatePyMessageKey(response);

  console.log("Test passed: Found pyMessageKey = \"Item created.\" in response.data");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Test failed: ${message}`);
  process.exitCode = 1;
});
