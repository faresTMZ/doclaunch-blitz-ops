type CompareInput = {
  productName: string;
  audience: string;
  tone: string;
  before: string;
  after: string;
};

type ChangeType = "added" | "changed" | "removed" | "unclear";
type Evidence = { value: string; sourceQuote: string } | null;
type Change = {
  id: string;
  type: ChangeType;
  field: string;
  summary: string;
  before: Evidence;
  after: Evidence;
  documentationImpact: string;
  grounded: boolean;
};

const stopWords = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it", "of", "on", "or", "the", "their", "this", "to", "when", "with"]);
const explicitRemoval = /\b(no longer|removed|discontinued|deprecated|will not|is not available|are not available|unsupported|cannot be used)\b/i;

const normalize = (value: string) => value.toLowerCase().replace(/[“”‘’'".,:;!?()]/g, "").replace(/\s+/g, " ").trim();

function sentences(text: string) {
  return text.replace(/^#+\s*.*$/gm, "").split(/(?<=[.!?])\s+|\n+/).map((item) => item.trim()).filter((item) => item.length > 24);
}

function tokens(text: string) {
  return new Set(normalize(text).split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word)));
}

function similarity(left: string, right: string) {
  const a = tokens(left);
  const b = tokens(right);
  const common = [...a].filter((word) => b.has(word)).length;
  return common / Math.max(1, Math.min(a.size, b.size));
}

function inferField(text: string, index: number) {
  const lower = text.toLowerCase();
  if (/per month|per day|per week|limit|maximum|minimum|receive one|receive two|allowance/.test(lower)) return "Usage allowance";
  if (/available|country|countries|united states|canada|android|ios|web|version|launch|release/.test(lower)) return "Availability";
  if (/eligible|aged|age|customer|player|user segment/.test(lower)) return "Eligibility";
  if (/profile|settings|select|click|tap|check|remaining/.test(lower)) return "Customer steps";
  if (/support|agent|verify|contact|replacement/.test(lower)) return "Support guidance";
  if (/notification|email|message|alert/.test(lower)) return "Customer notification";
  if (/refund|restore|cannot|restriction/.test(lower)) return "Limitations";
  return `Product behavior ${index + 1}`;
}

function impactFor(field: string, type: ChangeType) {
  if (type === "unclear") return `Hold the ${field.toLowerCase()} update until Product confirms whether the Version A detail still applies.`;
  if (field === "Availability") return "Update the availability section, launch note, and related support macros.";
  if (field === "Usage allowance" || field === "Limitations") return "Update the Help Centre limits, FAQ answer, and agent guidance.";
  if (field === "Customer steps") return "Update the customer procedure and verify any supporting screenshots.";
  if (field === "Support guidance") return "Update the internal escalation and troubleshooting guidance.";
  if (field === "Customer notification") return "Add the new customer-facing behavior to the article and release notes.";
  return type === "added" ? "Add this behavior to the Help Centre article and release notes." : "Update the affected Help Centre section and release notes.";
}

function buildChange(type: ChangeType, before: string | null, after: string | null, index: number): Change {
  const field = inferField(`${before || ""} ${after || ""}`, index);
  const summary = type === "added"
    ? `A new ${field.toLowerCase()} detail appears in Version B.`
    : type === "removed"
      ? `Version B explicitly removes a previous ${field.toLowerCase()} detail.`
      : type === "unclear"
        ? `A Version A ${field.toLowerCase()} detail is not mentioned in Version B.`
        : `The documented ${field.toLowerCase()} changes between versions.`;
  return {
    id: `change-${index + 1}`,
    type,
    field,
    summary,
    before: before ? { value: before, sourceQuote: before } : null,
    after: after ? { value: after, sourceQuote: after } : null,
    documentationImpact: impactFor(field, type),
    grounded: true,
  };
}

function compareDeterministically(input: CompareInput) {
  const beforeItems = sentences(input.before);
  const afterItems = sentences(input.after);
  const usedAfter = new Set<number>();
  const changes: Change[] = [];

  beforeItems.forEach((beforeItem) => {
    const exactIndex = afterItems.findIndex((afterItem, index) => !usedAfter.has(index) && normalize(afterItem) === normalize(beforeItem));
    if (exactIndex >= 0) {
      usedAfter.add(exactIndex);
      return;
    }

    let bestIndex = -1;
    let bestScore = 0;
    afterItems.forEach((afterItem, index) => {
      if (usedAfter.has(index)) return;
      const score = similarity(beforeItem, afterItem);
      if (score > bestScore) { bestScore = score; bestIndex = index; }
    });

    if (bestIndex >= 0 && bestScore >= 0.42) {
      const afterItem = afterItems[bestIndex];
      usedAfter.add(bestIndex);
      changes.push(buildChange(explicitRemoval.test(afterItem) ? "removed" : "changed", beforeItem, afterItem, changes.length));
    } else {
      changes.push(buildChange("unclear", beforeItem, null, changes.length));
    }
  });

  afterItems.forEach((afterItem, index) => {
    if (usedAfter.has(index)) return;
    changes.push(buildChange(explicitRemoval.test(afterItem) ? "removed" : "added", null, afterItem, changes.length));
  });

  const questions = changes.filter((change) => change.type === "unclear" && change.before).map((change) => `Does this Version A ${change.field.toLowerCase()} detail still apply: “${change.before?.value}”?`);
  const title = input.after.match(/^#\s+(.+)$/m)?.[1]?.trim() || "Product update";
  const publishable = changes.filter((change) => change.type !== "unclear");
  const grouped = (["added", "changed", "removed"] as ChangeType[]).map((type) => {
    const items = publishable.filter((change) => change.type === type);
    if (!items.length) return "";
    return `## ${type[0].toUpperCase()}${type.slice(1)}\n\n${items.map((change) => `- **${change.field}:** ${change.after?.value || change.summary}${change.before ? `\n  - Previously: ${change.before.value}` : ""}`).join("\n")}`;
  }).filter(Boolean).join("\n\n");
  const questionSection = questions.length ? `\n\n## Needs confirmation\n\n${questions.map((question) => `- ${question}`).join("\n")}` : "";
  const compareReleaseNotes = `# ${input.productName} release notes: ${title}\n\n${grouped || "No publishable changes were detected."}${questionSection}`;

  const afterFacts = afterItems.slice(0, 10).map((item, index) => ({ field: inferField(item, index), value: item }));
  const sections = new Map<string, string[]>();
  afterFacts.forEach((fact) => sections.set(fact.field, [...(sections.get(fact.field) || []), fact.value]));
  const updatedHelpCentre = `# ${title}\n\n${[...sections.entries()].map(([field, values]) => `## ${field}\n\n${values.join("\n\n")}`).join("\n\n")}${questionSection}`;

  const comparisonScore = Math.max(55, Math.min(98, 94 - questions.length * 4));
  return { changes, questions, groundingWarnings: [], comparisonScore, provider: "Demo engine", artifacts: { compareReleaseNotes, updatedHelpCentre } };
}

function parseJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return JSON.parse(fenced || text);
}

function evidenceGrounded(evidence: Evidence, source: string) {
  if (!evidence) return true;
  const quote = normalize(evidence.sourceQuote);
  return quote.length > 8 && normalize(source).includes(quote);
}

async function compareWithAi(input: CompareInput, apiKey: string, model: string, baseUrl: string) {
  const prompt = `You compare product specifications for a customer-support documentation team. Identify meaningful changes between Version A and Version B.\n\nRules:\n- Use only facts explicitly present in the supplied versions.\n- A Version A detail absent from Version B is UNCLEAR, not removed.\n- Use REMOVED only when Version B explicitly says the behavior is removed, discontinued, unsupported, or no longer available.\n- Each before and after evidence object must include a short verbatim sourceQuote from the corresponding version.\n- Generate release notes only from added, changed, or explicitly removed details.\n- updatedHelpCentre must reflect Version B and label unresolved Version A details as needing confirmation.\n- Write for ${input.audience} in a ${input.tone.toLowerCase()} tone.\n- Return valid JSON only with this exact shape:\n{"changes":[{"type":"added|changed|removed|unclear","field":"...","summary":"...","before":{"value":"...","sourceQuote":"..."}|null,"after":{"value":"...","sourceQuote":"..."}|null,"documentationImpact":"..."}],"questions":["..."],"artifacts":{"compareReleaseNotes":"markdown","updatedHelpCentre":"markdown"}}\n\nProduct: ${input.productName}\n\nVERSION A:\n${input.before}\n\nVERSION B:\n${input.after}`;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model, temperature: 0.1, messages: [{ role: "user", content: prompt }] }),
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}.`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned an empty response.");
  const parsed = parseJson(content) as { changes?: unknown[]; questions?: unknown[]; artifacts?: Record<string, unknown> };
  if (!Array.isArray(parsed.changes) || !parsed.artifacts) throw new Error("AI comparison did not match the expected structure.");

  const allowed = new Set<ChangeType>(["added", "changed", "removed", "unclear"]);
  const changes = parsed.changes.map((raw, index) => {
    const item = raw as Record<string, unknown>;
    const type = allowed.has(item.type as ChangeType) ? item.type as ChangeType : "unclear";
    const toEvidence = (value: unknown): Evidence => {
      if (!value || typeof value !== "object") return null;
      const candidate = value as Record<string, unknown>;
      return typeof candidate.value === "string" && typeof candidate.sourceQuote === "string" ? { value: candidate.value, sourceQuote: candidate.sourceQuote } : null;
    };
    const before = toEvidence(item.before);
    const after = toEvidence(item.after);
    return {
      id: `change-${index + 1}`,
      type,
      field: String(item.field || `Product detail ${index + 1}`),
      summary: String(item.summary || "Product detail changed."),
      before,
      after,
      documentationImpact: String(item.documentationImpact || "Review the affected documentation."),
      grounded: evidenceGrounded(before, input.before) && evidenceGrounded(after, input.after),
    };
  });

  const questions = Array.isArray(parsed.questions) ? parsed.questions.filter((item): item is string => typeof item === "string") : [];
  const artifacts = { compareReleaseNotes: String(parsed.artifacts.compareReleaseNotes || ""), updatedHelpCentre: String(parsed.artifacts.updatedHelpCentre || "") };
  if (!artifacts.compareReleaseNotes || !artifacts.updatedHelpCentre) throw new Error("AI comparison is missing a document.");
  const groundingWarnings = changes.filter((change) => !change.grounded).map((change) => `Review evidence for “${change.field}”.`);
  const combinedNumbers = new Set(`${input.before} ${input.after}`.match(/\b\d+(?:[.,]\d+)?%?\b/g) || []);
  const outputNumbers = new Set(Object.values(artifacts).join(" ").match(/\b\d+(?:[.,]\d+)?%?\b/g) || []);
  [...outputNumbers].filter((number) => !combinedNumbers.has(number)).forEach((number) => groundingWarnings.push(`Generated documents contain “${number}”, which was not found in either version.`));
  const comparisonScore = Math.max(50, Math.min(98, 92 - questions.length * 3 - groundingWarnings.length * 6));
  return { changes, questions, groundingWarnings, comparisonScore, provider: `AI · ${model}`, artifacts };
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as CompareInput;
    if (!input.before || !input.after || input.before.trim().length < 80 || input.after.trim().length < 80) {
      return Response.json({ error: "Both versions need at least 80 characters." }, { status: 400 });
    }
    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL;
    const baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
    const output = apiKey && model ? await compareWithAi(input, apiKey, model, baseUrl) : compareDeterministically(input);
    return Response.json(output);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to compare versions." }, { status: 500 });
  }
}
