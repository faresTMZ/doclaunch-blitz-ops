type Input = {
  productName: string;
  audience: string;
  tone: string;
  brief: string;
};

type RawFact = { label?: unknown; value?: unknown; sourceQuote?: unknown };

const normalize = (value: string) => value.toLowerCase().replace(/[“”‘’'".,:;!?()]/g, "").replace(/\s+/g, " ").trim();

function isGrounded(quote: string, brief: string) {
  const normalizedQuote = normalize(quote);
  return normalizedQuote.length > 8 && normalize(brief).includes(normalizedQuote);
}

function sentenceList(brief: string) {
  return brief
    .replace(/^#+\s*/gm, "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 28);
}

function labelFor(sentence: string, index: number) {
  const lower = sentence.toLowerCase();
  if (/launch|available|version|september|october|november|december|january|february|march|april|may|june|july|august/.test(lower)) return "Availability";
  if (/eligible|aged|customer|player|user|audience/.test(lower)) return "Eligibility";
  if (/cannot|limit|only|not available|restriction/.test(lower)) return "Limitations";
  if (/profile|settings|select|click|tap|check/.test(lower)) return "Customer steps";
  if (/support|agent|verify|contact/.test(lower)) return "Support guidance";
  return index === 0 ? "Feature overview" : "Product behavior";
}

function detectMissingInfo(brief: string) {
  const lower = brief.toLowerCase();
  const checks = [
    { pattern: /android|ios|web|platform/, question: "Which platforms are supported, and is there a timeline for the remaining platforms?" },
    { pattern: /launch|release|available|rollout|version/, question: "What is the confirmed release date or rollout plan?" },
    { pattern: /eligible|eligibility|aged|customer|player|user/, question: "Which customer segments are eligible for this feature?" },
    { pattern: /support|contact|troubleshoot|cannot|error|issue/, question: "What troubleshooting or escalation path should Support follow?" },
    { pattern: /limit|once|cannot|maximum|minimum|per month|per day/, question: "Are there usage limits or exceptions customers should know about?" },
  ];
  const missing = checks.filter((check) => !check.pattern.test(lower)).map((check) => check.question);
  return missing.length ? missing.slice(0, 4) : [
    "Is the feature available to customers on legacy app versions?",
    "Which analytics event confirms successful adoption after launch?",
  ];
}

function titleFromBrief(brief: string) {
  const heading = brief.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || brief.split(/[.!\n]/)[0].replace(/^#+\s*/, "").trim().slice(0, 70) || "New feature";
}

function demoGeneration(input: Input) {
  const sentences = sentenceList(input.brief);
  const title = titleFromBrief(input.brief);
  const facts = sentences.slice(0, 8).map((sentence, index) => ({
    label: labelFor(sentence, index),
    value: sentence,
    sourceQuote: sentence,
    grounded: true,
  }));
  const missingInfo = detectMissingInfo(input.brief);
  const overview = facts[0]?.value || sentences[0] || input.brief.slice(0, 220);
  const availability = facts.find((fact) => fact.label === "Availability")?.value;
  const eligibility = facts.find((fact) => fact.label === "Eligibility")?.value;
  const limitations = facts.filter((fact) => fact.label === "Limitations").map((fact) => fact.value);
  const steps = facts.filter((fact) => fact.label === "Customer steps" || fact.label === "Product behavior").map((fact) => fact.value);
  const support = facts.find((fact) => fact.label === "Support guidance")?.value;

  const helpCentre = `# ${title}\n\n${overview}\n\n## Who can use this feature\n\n${eligibility || "Eligibility details need confirmation before publication."}\n\n## Availability\n\n${availability || "Release timing and supported platforms need confirmation."}\n\n## How it works\n\n${steps.length ? steps.map((step, index) => `${index + 1}. ${step}`).join("\n") : "Detailed customer steps need confirmation."}\n\n## Important limitations\n\n${limitations.length ? limitations.map((item) => `- ${item}`).join("\n") : "- Usage limits need confirmation."}\n\n## Need help?\n\n${support || `Contact ${input.productName} Customer Support for help.`}`;

  const faqQuestions = [
    [`What is ${title}?`, overview],
    [`Who can use ${title}?`, eligibility || "Eligibility details need confirmation."],
    [`When is ${title} available?`, availability || "Release timing needs confirmation."],
    [`Are there any limitations?`, limitations.join(" ") || "Usage limits need confirmation."],
  ];
  const faq = `# ${title}: Frequently asked questions\n\n${faqQuestions.map(([question, answer]) => `## ${question}\n\n${answer}`).join("\n\n")}`;

  const releaseNotes = `# ${input.productName} release notes: ${title}\n\n## What’s new\n\n${overview}\n\n## Who gets it\n\n${eligibility || "Eligibility details need confirmation."}\n\n## Availability\n\n${availability || "Release timing needs confirmation."}\n\n## Good to know\n\n${limitations.length ? limitations.map((item) => `- ${item}`).join("\n") : "- Usage limits need confirmation."}`;

  const coverageScore = Math.max(62, Math.min(96, 58 + facts.length * 5 - missingInfo.length * 2));
  return { facts, missingInfo, groundingWarnings: [], coverageScore, provider: "Demo engine", artifacts: { helpCentre, faq, releaseNotes } };
}

function parseJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return JSON.parse(fenced || text);
}

async function aiGeneration(input: Input, apiKey: string, model: string, baseUrl: string) {
  const prompt = `You are a customer support documentation specialist. Create a source-grounded release documentation pack from the feature brief below.\n\nRules:\n- Use only facts explicitly present in the source brief.\n- Never invent dates, availability, behavior, eligibility, limits, or support procedures.\n- Every extracted fact must include a short verbatim sourceQuote copied from the brief.\n- Put missing publishing-critical information in missingInfo as direct questions.\n- Keep the documentation ${input.tone.toLowerCase()} for ${input.audience}.\n- Return valid JSON only, with this exact shape:\n{"facts":[{"label":"...","value":"...","sourceQuote":"..."}],"missingInfo":["..."],"artifacts":{"helpCentre":"markdown","faq":"markdown","releaseNotes":"markdown"}}\n\nProduct: ${input.productName}\nAudience: ${input.audience}\n\nSOURCE BRIEF:\n${input.brief}`;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}.`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned an empty response.");
  const parsed = parseJson(content) as { facts?: RawFact[]; missingInfo?: unknown; artifacts?: Record<string, unknown> };
  if (!Array.isArray(parsed.facts) || !parsed.artifacts) throw new Error("AI response did not match the expected structure.");

  const facts = parsed.facts
    .filter((fact) => typeof fact.label === "string" && typeof fact.value === "string" && typeof fact.sourceQuote === "string")
    .map((fact) => {
      const sourceQuote = fact.sourceQuote as string;
      return { label: fact.label as string, value: fact.value as string, sourceQuote, grounded: isGrounded(sourceQuote, input.brief) };
    });
  const missingInfo = Array.isArray(parsed.missingInfo) ? parsed.missingInfo.filter((item): item is string => typeof item === "string") : [];
  const artifacts = {
    helpCentre: String(parsed.artifacts.helpCentre || ""),
    faq: String(parsed.artifacts.faq || ""),
    releaseNotes: String(parsed.artifacts.releaseNotes || ""),
  };
  if (!artifacts.helpCentre || !artifacts.faq || !artifacts.releaseNotes) throw new Error("AI response is missing a document.");
  const ungroundedFacts = facts.filter((fact) => !fact.grounded);
  const sourceNumbers = new Set(input.brief.match(/\b\d+(?:[.,]\d+)?%?\b/g) || []);
  const outputNumbers = new Set(Object.values(artifacts).join(" ").match(/\b\d+(?:[.,]\d+)?%?\b/g) || []);
  const unsupportedNumbers = [...outputNumbers].filter((value) => !sourceNumbers.has(value));
  const groundingWarnings = [
    ...ungroundedFacts.map((fact) => `Review source quote for “${fact.label}”.`),
    ...unsupportedNumbers.map((value) => `Generated documents contain “${value}”, which was not found in the source.`),
  ];
  const coverageScore = Math.max(50, Math.min(98, 70 + facts.length * 4 - missingInfo.length * 3 - groundingWarnings.length * 5));
  return { facts, missingInfo, groundingWarnings, coverageScore, provider: `AI · ${model}`, artifacts };
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as Input;
    if (!input.brief || input.brief.trim().length < 80) {
      return Response.json({ error: "The feature brief needs at least 80 characters." }, { status: 400 });
    }

    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL;
    const baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
    const output = apiKey && model
      ? await aiGeneration(input, apiKey, model, baseUrl)
      : demoGeneration(input);
    return Response.json(output);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to generate documentation." }, { status: 500 });
  }
}
