# DocLaunch

DocLaunch turns a feature specification into a consistent customer-support release pack: a Help Centre article, FAQ, and release notes. Unlike a one-shot writing assistant, it first creates a shared fact map, surfaces missing information, and checks that its evidence came from the supplied source.

This repository is the primary Product Builder submission for Option B of the Blitz Operations Engineer case study.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Open the local address shown in the terminal, choose **Load Blitz example**, then generate the release pack. No API key is required for the deterministic demo engine.

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

### Human review stays in the loop

Generated Markdown remains editable and exportable. The product is designed to accelerate a support operator, not publish content without approval.

### Useful without credentials

Reviewers can exercise the complete workflow using the embedded Blitz example and deterministic demo engine. Live AI mode is an optional configuration, so evaluation is not blocked by a paid tool or a missing account.

## Technical decisions

- **Vinext, React, and TypeScript** keep the application in one deployable full-stack project.
- A small server route owns provider credentials and generation, keeping secrets out of the client.
- The AI integration uses a provider-agnostic HTTP adapter rather than coupling the product to one SDK.
- Responses are schema-checked before reaching the interface.
- Verbatim source quotes are normalized and checked against the input brief.
- Numbers in generated documents are compared with numbers present in the source and flagged when unsupported.
- The MVP is stateless: no customer text or generated document is persisted.

## How the workflow works

1. The user provides a product name, audience, tone, and feature specification.
2. The engine extracts a fact map and verbatim evidence.
3. It generates a Help Centre article, FAQ, and release notes from the same facts.
4. Deterministic checks calculate release readiness and flag suspicious evidence or numbers.
5. The operator reviews open questions, edits the documents, and exports Markdown.

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
- Only plain text and Markdown inputs are supported in this MVP.
- Edits are local to the current browser session and are not versioned.
- Output is English-first and has not been evaluated across multiple locales.

## With one additional week

1. Add screenshot, pull-request diff, and structured product-spec ingestion.
2. Compare a new release with existing documentation and propose targeted updates.
3. Add sentence-level citations and a stronger entailment-based hallucination check.
4. Introduce reusable voice, terminology, and compliance rules per product.
5. Add approval states, version history, and exports to Help Centre platforms.
6. Evaluate output quality on a labelled set of real launches, measuring factual precision, coverage, edit distance, and time saved.

## Repository map

```text
app/page.tsx              Product interface
app/api/generate/route.ts Generation, grounding, and demo engine
app/globals.css           Responsive visual system
examples/                 Ready-to-use feature brief
tests/                    Build-level product checks
```

## Privacy and safety

DocLaunch does not store submitted specifications. Before using a third-party AI provider with confidential product information, the operator should confirm the provider's data-retention and access policies.
