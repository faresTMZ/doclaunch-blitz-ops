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

## Next steps

### AI-assisted drafting and comparison (planned)

A future version can integrate and validate hosted AI models to produce more natural drafts, identify less obvious differences between documents, and improve open-question suggestions. The implementation should be evaluated for source grounding, consistency, latency, and cost before being presented as production-ready.

### More source and publishing formats

Add support for common documentation formats such as PDF, DOCX and Images, followed by direct import and publishing integrations for the tools used by support teams.

### Saved projects and review workflow

Persist project history, reviewer comments, approval status, and previous exports so teams can collaborate on a release pack and keep a clear audit trail.

## Validation

```bash
npm run lint
npm test
```
