type CaseKeyTemplateConfig = {
  prefix: string;
  template: string;
};

const DEFAULT_CASE_KEY_CONFIG: CaseKeyTemplateConfig[] = [
  { prefix: "T", template: "MYORG-TIMESHEET-WORK%20{decisionID}" },
  { prefix: "BOI", template: "AF-Services-BOI-WORK {decisionID}" },
  { prefix: "LEV", template: "AF-Services-WOrk-LEV {decisionID}" }
];

function extractPrefix(decisionID: string): string {
  const [prefix] = decisionID.split("-");
  return prefix?.trim().toUpperCase() ?? "";
}

export function buildCaseInstanceKey(
  decisionID: string,
  config: CaseKeyTemplateConfig[] = DEFAULT_CASE_KEY_CONFIG
): string {
  const normalizedDecisionID = decisionID.trim();
  if (normalizedDecisionID.length === 0) {
    throw new Error("decisionID cannot be empty.");
  }

  const prefix = extractPrefix(normalizedDecisionID);
  const match = config.find((item) => item.prefix.toUpperCase() === prefix);
  if (!match) {
    throw new Error(`No case instance key template configured for prefix: ${prefix}`);
  }

  return match.template.replace("{decisionID}", normalizedDecisionID);
}

export type { CaseKeyTemplateConfig };
