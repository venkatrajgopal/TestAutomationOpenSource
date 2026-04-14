import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

type ActionResult = {
  name: string;
  ID: string;
};

type ActionsOutputEntry = {
  id: string;
  results: ActionResult[];
};

const defaultOutputPath = path.join(process.cwd(), "actionsOutput.json");

function generateId(): string {
  try {
    return randomUUID();
  } catch {
    return `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  }
}

function normalizeEntries(rawEntries: unknown[]): ActionsOutputEntry[] {
  return rawEntries.map((entry) => {
    if (!entry || typeof entry !== "object") {
      return { id: generateId(), results: [] };
    }

    const value = entry as Partial<ActionsOutputEntry> & { actions?: string[] };
    if (Array.isArray(value.results)) {
      return { id: typeof value.id === "string" ? value.id : generateId(), results: value.results };
    }

    if (Array.isArray(value.actions)) {
      const results = value.actions.map((name) => ({
        name: String(name),
        ID: ""
      }));
      return { id: typeof value.id === "string" ? value.id : generateId(), results };
    }

    return { id: typeof value.id === "string" ? value.id : generateId(), results: [] };
  });
}

function readExistingEntries(filePath: string): ActionsOutputEntry[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const raw = readFileSync(filePath, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("actionsOutput.json must contain an array.");
    }

    return normalizeEntries(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to parse actionsOutput.json: ${message}`);
  }
}

export function appendActionsOutput(
  results: ActionResult[],
  options?: { id?: string; filePath?: string }
): ActionsOutputEntry {
  const filePath = options?.filePath ?? defaultOutputPath;
  const entry: ActionsOutputEntry = {
    id: options?.id ?? generateId(),
    results
  };

  const entries = readExistingEntries(filePath);
  entries.push(entry);

  writeFileSync(filePath, JSON.stringify(entries, null, 2), "utf-8");
  return entry;
}
