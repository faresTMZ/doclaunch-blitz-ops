# DocLaunch

DocLaunch turns a feature specification into a consistent customer-support release pack, or compares two product versions and updates the affected documentation. Unlike a one-shot writing assistant, it first creates a shared evidence map, surfaces missing information, and checks that its evidence came from the supplied source.

This repository is the primary Product Builder submission for Option B of the Blitz Operations Engineer case study.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Open the local address shown in the terminal, choose either workflow, then load its fictional Blitz example. No API key is required for the deterministic demo engine. All sample product details are invented for this case study and must not be treated as real Blitz functionality.

### Enable live AI generation

DocLaunch supports any provider exposing an OpenAI-compatible chat-completions endpoint.

```bash
cp .env.example .env.local
```

Set:

- `LLM_API_KEY`: provider API key
- `LLM_MODEL`: model identifier exposed by that provider
- `LLM_BASE_URL`: compatible API base URL; defaults to OpenAI's `/v1` endpoint

Restart the development server. The release-readiness panel shows whether a pack came from the demo engine or a live model. Secrets are never entered in the browser or committed to source control.

## Product decisions

### One shared fact base

Generating three documents independently creates contradictions. DocLaunch first extracts structured facts with verbatim evidence, then asks the model to create every deliverable from that shared context.

### Missing information is a product output

A support writer needs to know what cannot yet be published. DocLaunch turns absent release dates, eligibility rules, platform coverage, limits, and escalation procedures into direct questions instead of quietly filling the gaps.

### Absence is not removal

During version comparison, a Version A detail that is missing from Version B is labelled **Unclear**. DocLaunch uses **Removed** only when Version B explicitly says that a behavior is removed, discontinued, unsupported, or no longer available. This avoids silently deleting valid documentation from an incomplete specification.

### Human review stays in the loop

Generated Markdown remains editable and exportable. The product is designed to accelerate a support operator, not publish content without approval.

### Useful without credentials

Reviewers can exercise the complete workflow using the embedded Blitz example and deterministic demo engine. Live AI mode is an optional configuration, so evaluation is not blocked by a paid tool or a missing account.

## Technical decisions

- **Vinext, React, and TypeScript** keep the application in one deployable full-stack project.
- A small server route owns provider credentials and generation, keeping secrets out of the client.
- The AI integration uses a provider-agnostic HTTP adapter rather than coupling the product to one SDK.
- Responses are schema-checked before reaching the interface.
- Verbatim source quotes are normalized and checked against the relevant feature brief or product version.
- Numbers in generated documents are compared with numbers present in the source and flagged when unsupported.
- The MVP is stateless: no customer text or generated document is persisted.

## How the workflow works

### Generate from specification

1. The user provides a product name, audience, tone, and feature specification.
2. The engine extracts an evidence map with verbatim excerpts.
3. It generates a Help Centre article, FAQ, and release notes from the same facts.
4. Deterministic checks calculate release readiness and flag suspicious evidence or numbers.
5. The operator reviews open questions, edits the documents, and exports Markdown.

### Compare product versions

1. The user provides the current and new versions of a specification or document.
2. The engine aligns related sentences and classifies them as Added, Changed, explicitly Removed, or Unclear.
3. Every change retains Version A and Version B evidence.
4. DocLaunch explains the documentation impact, generates release notes, and proposes an updated Help Centre article.
5. The operator resolves unclear items before applying the update.

## Validation

```bash
npm run build
npm test
```

The application also handles short inputs, provider errors, malformed model responses, and missing documents without exposing credentials or returning a partial pack as successful.

## Known limitations

- The demo engine uses rule-based extraction and is intended for product evaluation, not production authoring.
- Live mode expects a compatible chat-completions response and does not yet include provider-specific retries.
- Grounding checks verify quoted evidence and numeric claims, but do not perform full natural-language entailment.
- The deterministic comparison engine aligns sentences using lexical similarity; live AI mode handles paraphrases more effectively.
- Only plain text and Markdown inputs are supported in this MVP.
- Edits are local to the current browser session and are not versioned.
- Output is English-first and has not been evaluated across multiple locales.

## With one additional week

1. Add screenshot, pull-request diff, and structured product-spec ingestion.
2. Add sentence-level citations and a stronger entailment-based hallucination check.
3. Introduce reusable voice, terminology, and compliance rules per product.
4. Add approval states, version history, and exports to Help Centre platforms.
5. Evaluate output quality on a labelled set of real launches, measuring factual precision, coverage, diff accuracy, edit distance, and time saved.

## Repository map

```text
app/page.tsx              Product interface
app/api/generate/route.ts Generation, grounding, and demo engine
app/api/compare/route.ts  Version comparison and change validation
app/globals.css           Responsive visual system
examples/                 Ready-to-use feature brief
tests/                    Build-level product checks
```

## Privacy and safety

DocLaunch does not store submitted specifications. Before using a third-party AI provider with confidential product information, the operator should confirm the provider's data-retention and access policies.
