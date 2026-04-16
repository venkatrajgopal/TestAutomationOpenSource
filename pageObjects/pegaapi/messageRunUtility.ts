import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

export type StructuredMessage = {
	pageName: string;
	requestBody: JsonValue;
	responseBody: JsonValue;
};

export type StoredLogRun = {
	runId: string;
	timestamp: string;
	messages: StructuredMessage[];
};

export type MessageParser = (message: string) => StructuredMessage;

export type InvokeAndStoreOptions = {
	endpoint?: string;
	filePath?: string;
	messageParser?: MessageParser;
	headers?: Record<string, string>;
};

const defaultEndpoint =
	"https://67fbfb92-5c23-4ed5-8587-4714b40b81f4.mock.pstmn.io/prweb/api/v1/cases/MYORG-TIMESHEET-WORK%20T-6";
const defaultFilePath = path.join(process.cwd(), "test-results", "message-runs.json");

function generateRunId(): string {
	try {
		return randomUUID();
	} catch {
		return `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
	}
}

function readStoredRuns(filePath: string): StoredLogRun[] {
	if (!existsSync(filePath)) {
		return [];
	}

	const raw = readFileSync(filePath, "utf-8");
	let parsed: unknown;

	try {
		parsed = JSON.parse(raw) as unknown;
	} catch {
		throw new Error(`Stored run file contains invalid JSON: ${filePath}`);
	}

	if (!Array.isArray(parsed)) {
		throw new Error(`Stored run file must contain an array: ${filePath}`);
	}

	return parsed as StoredLogRun[];
}

function writeStoredRuns(filePath: string, runs: StoredLogRun[]): void {
	mkdirSync(path.dirname(filePath), { recursive: true });
	writeFileSync(filePath, JSON.stringify(runs, null, 2), "utf-8");
}

function isJsonObject(value: unknown): value is JsonObject {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeEscapedJsonText(text: string): string {
	const trimmed = text.trim();
	if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
		try {
			const parsed = JSON.parse(trimmed) as unknown;
			if (typeof parsed === "string") {
				return parsed;
			}
		} catch {
			return trimmed;
		}
	}

	return trimmed;
}

function parseJsonValue(text: string): JsonValue {
	const normalized = normalizeEscapedJsonText(text);

	try {
		const parsed = JSON.parse(normalized) as unknown;
		return parsed as JsonValue;
	} catch {
		return normalized;
	}
}

function extractJsonSegment(source: string, startMarker: string, endMarker?: string): string {
	const startIndex = source.indexOf(startMarker);
	if (startIndex < 0) {
		throw new Error(`Unable to locate marker: ${startMarker}`);
	}

	const contentStart = startIndex + startMarker.length;
	const contentEnd = endMarker ? source.indexOf(endMarker, contentStart) : source.length;

	if (contentEnd < 0) {
		throw new Error(`Unable to locate end marker: ${endMarker}`);
	}

	const raw = source.slice(contentStart, contentEnd).trim();
	if (raw.length === 0) {
		throw new Error(`Empty JSON segment between ${startMarker} and ${endMarker ?? "end of message"}.`);
	}

	return raw.replace(/^:\s*/u, "");
}

function parseDefaultMessage(message: string): StructuredMessage {
	const trimmed = message.trim();
	if (trimmed.length === 0) {
		throw new Error("Message cannot be empty.");
	}

	const pageNameSeparator = trimmed.indexOf(":");
	if (pageNameSeparator < 0) {
		throw new Error(`Unable to parse pageName from message: ${message}`);
	}

	const pageName = trimmed.slice(0, pageNameSeparator).trim();
	if (pageName.length === 0) {
		throw new Error(`Unable to determine pageName from message: ${message}`);
	}

	const requestMarker = "Request Body:";
	const responseMarker = "Response Body:";
	const requestBodyText = extractJsonSegment(trimmed, requestMarker, responseMarker);
	const responseBodyText = extractJsonSegment(trimmed, responseMarker);

	return {
		pageName,
		requestBody: parseJsonValue(requestBodyText),
		responseBody: parseJsonValue(responseBodyText)
	};
}

function extractMessages(payload: unknown): string[] {
	if (!isJsonObject(payload)) {
		throw new Error("API response must be a JSON object.");
	}

	const hits = payload.hits;
	if (!isJsonObject(hits)) {
		throw new Error("API response does not contain hits object.");
	}

	const entries = hits.hits;
	if (!Array.isArray(entries)) {
		throw new Error("API response does not contain hits.hits array.");
	}

	return entries.map((entry, index) => {
		if (!isJsonObject(entry)) {
			throw new Error(`Invalid hits.hits entry at index ${index}.`);
		}

		const source = isJsonObject(entry._source) ? entry._source : entry;
		const message = typeof source.message === "string" ? source.message : undefined;

		if (!message || message.trim().length === 0) {
			throw new Error(`hits.hits entry at index ${index} is missing _source.message.`);
		}

		return message;
	});
}

function parseMessages(messages: string[], messageParser: MessageParser): StructuredMessage[] {
	return messages.map((message) => messageParser(message));
}

export function appendStoredRun(
	run: StoredLogRun,
	filePath = defaultFilePath
): StoredLogRun {
	const storedRuns = readStoredRuns(filePath);
	storedRuns.push(run);
	writeStoredRuns(filePath, storedRuns);
	return run;
}

export function getStoredRun(
	runId: string,
	filePath = defaultFilePath
): StoredLogRun | undefined {
	return readStoredRuns(filePath).find((run) => run.runId === runId);
}

export function parseStructuredMessage(message: string): StructuredMessage {
	return parseDefaultMessage(message);
}

export async function fetchParsePersistLogRun(
	request: APIRequestContext,
	requestBody: JsonValue,
	options?: InvokeAndStoreOptions
): Promise<string> {
	const endpoint = options?.endpoint ?? defaultEndpoint;
	const filePath = options?.filePath ?? defaultFilePath;
	const messageParser = options?.messageParser ?? parseDefaultMessage;

	const response = await request.post(endpoint, {
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			...(options?.headers ?? {})
		},
		data: requestBody
	});

	const responseText = await response.text();
	if (!response.ok()) {
		throw new Error(`Log API request failed (${response.status()}): ${responseText}`);
	}

	let responsePayload: unknown;
	try {
		responsePayload = JSON.parse(responseText) as unknown;
	} catch {
		throw new Error("Log API response is not valid JSON.");
	}

	const messages = parseMessages(extractMessages(responsePayload), messageParser);
	const run: StoredLogRun = {
		runId: generateRunId(),
		timestamp: new Date().toISOString(),
		messages
	};

	appendStoredRun(run, filePath);
	return run.runId;
}

export { defaultFilePath as defaultLogRunFilePath };
