import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { APIRequestContext } from "@playwright/test";

type TokenCache = {
  cacheKey: string;
  accessToken: string;
  tokenExpiryTime: number;
};

const tokenCachePath = path.join(process.cwd(), ".cache", "oauth-token-cache.json");
let accessToken: string | null = null;
let tokenExpiryTime: number | null = null;

function readTokenCache(cacheKey: string, now: number): string | null {
  if (!existsSync(tokenCachePath)) {
    return null;
  }

  try {
    const raw = readFileSync(tokenCachePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<TokenCache>;

    if (
      typeof parsed.cacheKey === "string" &&
      parsed.cacheKey === cacheKey &&
      typeof parsed.accessToken === "string" &&
      typeof parsed.tokenExpiryTime === "number" &&
      now < parsed.tokenExpiryTime
    ) {
      accessToken = parsed.accessToken;
      tokenExpiryTime = parsed.tokenExpiryTime;
      return parsed.accessToken;
    }
  } catch {
    return null;
  }

  return null;
}

function writeTokenCache(cacheKey: string, token: string, expiryTime: number): void {
  const cacheDir = path.dirname(tokenCachePath);
  mkdirSync(cacheDir, { recursive: true });

  const payload: TokenCache = {
    cacheKey,
    accessToken: token,
    tokenExpiryTime: expiryTime
  };

  writeFileSync(tokenCachePath, JSON.stringify(payload, null, 2), "utf-8");
}

export async function getAccessToken(
  request: APIRequestContext,
  tokenUrl: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const now = Date.now();
  const cacheKey = `${tokenUrl}|${clientId}`;

  if (accessToken && tokenExpiryTime && now < tokenExpiryTime) {
    return accessToken;
  }

  const cachedToken = readTokenCache(cacheKey, now);
  if (cachedToken) {
    return cachedToken;
  }

  const tokenResponse = await request.post(tokenUrl, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    form: {
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret
    }
  });

  const tokenText = await tokenResponse.text();
  if (!tokenResponse.ok()) {
    throw new Error(`OAuth token request failed (${tokenResponse.status()}): ${tokenText}`);
  }

  const tokenPayload = JSON.parse(tokenText) as Record<string, unknown>;
  const receivedToken = tokenPayload.access_token;
  if (typeof receivedToken !== "string" || receivedToken.length === 0) {
    throw new Error("OAuth response does not contain a valid access_token.");
  }

  const expiresInRaw = tokenPayload.expires_in;
  const expiresInSeconds =
    typeof expiresInRaw === "number" && Number.isFinite(expiresInRaw) ? expiresInRaw : 3600;

  const refreshSkewMs = 5_000;
  accessToken = receivedToken;
  tokenExpiryTime = now + expiresInSeconds * 1000 - refreshSkewMs;
  writeTokenCache(cacheKey, accessToken, tokenExpiryTime);

  return accessToken;
}
