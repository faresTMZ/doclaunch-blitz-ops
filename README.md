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

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000), select a workflow, and load its fictional example.

No API key is required for the demo. The example content is invented for this case study and does not describe real Blitz functionality.

## Using DocLaunch

1. Choose **Generate release pack** or **Compare versions**.
2. Add the source material manually, upload supported files, or load the example.
3. Run the generation or comparison.
4. Review the source evidence, open questions, and readiness checks.
5. Edit the proposed content and export it as Markdown.

Supported uploads: `.md`, `.txt`, `.html`, and `.htm`, up to 1 MB per file.

## Optional live AI mode

The default demo engine is deterministic and runs without credentials. To use a live model, copy `.env.example` to `.env.local` and configure:

- `LLM_API_KEY`;
- `LLM_MODEL`;
- `LLM_BASE_URL` for an OpenAI-compatible chat-completions endpoint.

Rebuild and restart the application after changing the configuration. Provider credentials remain on the server and are never entered in the browser.

## Product safeguards

- Generated documents share one source-backed fact map.
- Missing information becomes an explicit question instead of an invented answer.
- Evidence excerpts and unsupported numeric claims are checked before results are shown.
- Generated content stays editable and requires human review before publication.
- The application is stateless: submitted documents and generated content are not persisted.

## Validation

```bash
npm run lint
npm test
```
