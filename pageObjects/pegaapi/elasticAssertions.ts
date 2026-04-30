import { expect } from "@playwright/test";

export type JsonObject = Record<string, unknown>;

export type StoredMessage = {
  pageName: string;
  requestBody: JsonObject;
  responseBody: JsonObject;
  ResponseCode: number;
};

export type MessageCheck = {
  label: string;
  getValue: (message: StoredMessage) => unknown;
  isValid: (value: unknown) => boolean;
  failureMessage: (value: unknown) => string;
  assertionMessage: string;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  return typeof value === "string" && value.trim().length === 0;
}

export function findMessage(messages: StoredMessage[], name: string): StoredMessage | undefined {
  const target = normalize(name);
  return messages.find((message) => normalize(message.pageName).includes(target));
}

export function containsKeyword(message: StoredMessage, keyword: string): boolean {
  const target = normalize(keyword);
  if (normalize(message.pageName).includes(target)) {
    return true;
  }

  const requestText = JSON.stringify(message.requestBody).toLowerCase();
  const responseText = JSON.stringify(message.responseBody).toLowerCase();
  return requestText.includes(target) || responseText.includes(target);
}

export function validatePresence(
  messages: StoredMessage[],
  expectedLabels: string[],
  matcher: (message: StoredMessage, expectedLabel: string) => boolean
): string[] {
  const issues: string[] = [];

  for (const expectedLabel of expectedLabels) {
    const exists = messages.some((message) => matcher(message, expectedLabel));
    if (!exists) {
      issues.push(`Missing expected content: ${expectedLabel}`);
    }
    expect.soft(exists, `Expected storedRun to contain: ${expectedLabel}`).toBeTruthy();
  }

  return issues;
}

export function validateEachMessage(
  messages: StoredMessage[],
  check: (message: StoredMessage) => { ok: boolean; issue: string; assertionMessage: string }
): string[] {
  const issues: string[] = [];

  for (const message of messages) {
    const result = check(message);
    if (!result.ok) {
      issues.push(result.issue);
    }
    expect.soft(result.ok, result.assertionMessage).toBeTruthy();
  }

  return issues;
}

export function validateMessageChecks(
  messages: StoredMessage[],
  targetLabel: string,
  checks: MessageCheck[]
): string[] {
  const issues: string[] = [];
  const targetMessage = findMessage(messages, targetLabel);

  if (!targetMessage) {
    issues.push(`${targetLabel} message is missing.`);
    expect.soft(false, `${targetLabel} message should exist`).toBeTruthy();
    return issues;
  }

  for (const check of checks) {
    const value = check.getValue(targetMessage);
    const ok = check.isValid(value);
    if (!ok) {
      issues.push(check.failureMessage(value));
    }
    expect.soft(ok, check.assertionMessage).toBeTruthy();
  }

  return issues;
}

export function reportSummary(testName: string, issues: string[]): void {
  if (issues.length === 0) {
    console.log(`[${testName}] Summary: all checks passed.`);
    return;
  }

  const formatted = issues.map((issue) => `- ${issue}`).join("\n");
  console.log(`[${testName}] Summary:\n${formatted}`);
  expect.soft(issues, `[${testName}] validation failures:\n${formatted}`).toEqual([]);
}
