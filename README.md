# DocLaunch

DocLaunch is a local documentation workspace for customer-support teams. It turns product information into review-ready support content while keeping every output tied to the supplied source.

This project is the **Option B** submission for the Blitz Operations Engineer case study.

## What it does

DocLaunch supports two workflows:

### 1. Generate a release pack

Provide a feature specification and DocLaunch creates:

- a Help Centre article;
- an FAQ;
- release notes;
- a source map linking key facts to excerpts from the specification;
- open questions and readiness checks for information that is missing or unsupported.

All documents are generated from the same fact base, which helps keep them consistent.

### 2. Compare two documentation versions

Upload or paste a current version and an updated version. DocLaunch then:

- identifies what was added, changed, explicitly removed, or left unclear;
- shows the supporting text from both versions;
- explains the impact on customer-support documentation;
- proposes release notes and an updated Help Centre article.

A detail that simply disappears from the new version is marked **Unclear**, not **Removed**. This prevents an incomplete specification from silently deleting valid information.

## How to run the project

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000), select a workflow, and load its fictional example.

No API key is required for the demo. The example content is invented for this case study and does not describe real Blitz functionality.

### Using DocLaunch

1. Choose **Generate release pack** or **Compare versions**.
2. Add the source material manually, upload supported files, or load the example.
3. Run the generation or comparison.
4. Review the source evidence, open questions, and readiness checks.
5. Edit the proposed content and export it as Markdown.

Supported uploads: `.md`, `.txt`, `.html`, and `.htm`, up to 1 MB per file.

### Validation

```bash
npm run lint
npm test
```

`npm test` builds the project and runs the automated suite against the built worker, including the demo generation and comparison engine (fact grounding, coverage scoring, and the added/changed/removed/unclear classification).

### Optional: AI mode

Setting `LLM_API_KEY` and `LLM_MODEL` (see `.env.example`) switches both endpoints from the deterministic demo engine to a hosted OpenAI-compatible model. This path is implemented — prompts, response parsing, and grounding checks are in place in `app/api/generate/route.ts` and `app/api/compare/route.ts` — but I have **not run it against a real provider or token**. Treat it as infrastructure I built to make that switch possible, not as a validated feature. See [Known limitations](#known-limitations).

## Key product and technical decisions

- **Deterministic engine by default, AI as an opt-in switch.** Without `LLM_API_KEY`/`LLM_MODEL` set, DocLaunch runs on a regex/heuristic engine (`demoGeneration`, `compareDeterministically`) instead of calling a hosted model. This keeps the case study submission free to run, fully reproducible, and safe to demo without credentials, while still exercising the product's actual value proposition: turning source text into structured, grounded documentation. The AI code path exists behind the same interface for when a provider is configured.
- **Grounding over fluency.** Every extracted fact and every detected change must carry a verbatim source quote (`sourceQuote`) and a `grounded` flag. The UI surfaces ungrounded items as "Review" rather than hiding the uncertainty — the goal is to make a documentation assistant trustworthy, not just fast.
- **"Unclear" is a distinct state from "Removed."** A detail present in Version A and absent from Version B is only classified as `removed` when the new text explicitly says so (e.g. "no longer available", "discontinued"). Otherwise it's `unclear`. This avoids an incomplete or partial spec silently deleting valid customer-facing information.
- **Everything stays editable.** Generated Markdown is shown in an editable text area with copy/download actions, not locked behind a "final" output — support teams are expected to review and adjust before publishing.
- **No backend, no persistence.** The app is intentionally stateless: nothing is saved server-side, there's no database, no auth, no multi-user concept. This matches the "small product, local, easy to run" scope of the case study rather than a production support-tooling backend.

## Known limitations

- **The AI mode is unvalidated.** It has never been run against a real provider or API key, and there are no automated tests covering `aiGeneration`/`compareWithAi` (only the deterministic engine and the UI are tested). Prompt quality, JSON-parsing robustness, latency, and cost are all unverified — this needs real testing before it could be called production-ready.
- **The demo engine is heuristic, not NLU.** Sentence splitting, fact labelling, and change matching rely on regex and token-overlap similarity. It works well on the fictional example (and similarly structured specs) but will degrade on unusual formatting, non-English text, or specs that don't read as a sequence of declarative sentences.
- **The readiness/confidence scores are indicative, not calibrated.** `coverageScore` and `comparisonScore` are bounded arithmetic heuristics (based on fact count, open questions, and grounding warnings), not a statistically meaningful confidence metric. They're useful as a rough signal, not as a metric to report externally as-is.
- **No persistence.** Refreshing the page loses all generated content; there is no project history, versioning, or review/approval workflow.
- **Narrow input support.** Only `.md`, `.txt`, `.html`, `.htm`, up to 1 MB — no PDF, DOCX, images, or direct integration with a real product-spec or CMS source.
- **Single user, no auth.** There's no concept of accounts, permissions, or collaboration.

## What I'd build next with one more week

- **Validate and harden the AI mode**: test it against a real provider and token, add automated tests with mocked API responses, tune the prompts against harder specs, and add retries/timeouts/cost guardrails — only then would I call it production-ready rather than "wired up."
- **Broaden source formats and publishing**: accept PDF, DOCX, and images (e.g. OCR or vision-based extraction for screenshots), and add direct import/publishing integrations for the tools support teams actually use.
- **Saved projects and review workflow**: persist project history, reviewer comments, approval status, and previous exports so teams can collaborate on a release pack and keep an audit trail.
