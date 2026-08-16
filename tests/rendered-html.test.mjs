import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function callApi(body, path = "/api/generate") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("api-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the DocLaunch product", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>DocLaunch/);
  assert.match(html, /Turn product context into/);
  assert.match(html, /Load fictional example/);
  assert.match(html, /Generate release pack/);
  assert.match(html, /Compare versions/);
  assert.match(html, /Sample data is fictional/);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview|react-loading-skeleton/);
});

test("uses a white-led Blitz-inspired default visual system", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /--paper: #fcfcfa/);
  assert.match(css, /--violet: #8000ff/);
  assert.match(css, /--green: #a7ed4f/);
  assert.match(css, /\.workspace \{[^}]*background: #faf8fd/);
  assert.match(css, /\.workspace-grid \{[^}]*background: white/);
  assert.doesNotMatch(css, /background:\s*(?:#17211b|#202c25|#243129|#1d2921|#1c2720|var\(--ink\))/);
});

test("offers an accessible deep-violet dark theme switch", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /useState<Theme>\("light"\)/);
  assert.match(page, /app-shell theme-\$\{theme\}/);
  assert.match(page, /aria-pressed=\{theme === "dark"\}/);
  assert.match(page, /Switch to \$\{theme === "light" \? "dark" : "light"\} theme/);
  assert.match(css, /\.app-shell\.theme-dark/);
  assert.match(css, /\.theme-dark \.workspace \{ background: #260d3a; \}/);
  assert.doesNotMatch(css, /\.theme-dark[^\n]*background:\s*(?:black|#000(?:000)?)/i);
});

test("imports two documentation versions locally and constrains them to text formats", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Upload Version A/);
  assert.match(page, /Upload Version B/);
  assert.match(page, /Current documentation or specification/);
  assert.equal((page.match(/accept="\.md,\.txt,\.html,\.htm,text\/markdown,text\/plain,text\/html"/g) ?? []).length, 2);
  assert.match(page, /importDocumentationVersion\(event, "before"\)/);
  assert.match(page, /importDocumentationVersion\(event, "after"\)/);
  assert.match(page, /setBeforeBrief\(content\.trim\(\)\)/);
  assert.match(page, /setAfterBrief\(content\.trim\(\)\)/);
  assert.match(page, /setBeforeFileName\(file\.name\)/);
  assert.match(page, /setAfterFileName\(file\.name\)/);
  assert.match(page, /file\.size > 1_000_000/);
  assert.match(page, /await file\.text\(\)/);
  assert.match(page, /new DOMParser\(\)/);
  assert.doesNotMatch(page, /FormData|\/api\/upload|localStorage/);
  const exampleHandler = page.match(/const loadCompareExample = async \(\) => \{[\s\S]*?\n {2}\};/)?.[0] ?? "";
  assert.match(exampleHandler, /setBeforeFileName\(""\)/);
  assert.match(exampleHandler, /setAfterFileName\(""\)/);
  assert.match(exampleHandler, /fetch\("\/examples\/streak-shield-v1\.md"\)/);
  assert.match(exampleHandler, /fetch\("\/examples\/streak-shield-v2\.md"\)/);
  assert.doesNotMatch(exampleHandler, /Fictional Streak Shield 1\.0 example/);
  assert.doesNotMatch(page, /const sampleBefore|const sampleAfter/);
});

test("ships two distinct downloadable comparison example files", async () => {
  const [versionA, versionB] = await Promise.all([
    readFile(new URL("../public/examples/streak-shield-v1.md", import.meta.url), "utf8"),
    readFile(new URL("../public/examples/streak-shield-v2.md", import.meta.url), "utf8"),
  ]);
  assert.match(versionA, /Streak Shield 1\.0/);
  assert.match(versionA, /one Streak Shield per calendar month/);
  assert.match(versionB, /Streak Shield 1\.1/);
  assert.match(versionB, /two Streak Shields per calendar month/);
  assert.notEqual(versionA, versionB);
});

test("shows a meaningful comparison percentage and the complete change map", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /Comparison confidence \$\{compareResult\.comparisonScore\}%/);
  assert.match(page, /\{compareResult\.comparisonScore\}<small>%<\/small>/);
  assert.doesNotMatch(page, /\{compareResult\.changes\.length\}<small>∆<\/small>/);
  assert.match(css, /\.change-map \{ min-height: 550px; padding: 22px; \}/);
  assert.doesNotMatch(css, /\.change-map \{[^}]*height: 550px;[^}]*overflow: auto/);
});

test("builds a complete grounded release pack without credentials", async () => {
  const brief = "Streak Shield protects an eligible player's weekly play streak when they miss one day. It launches with mobile app version 8.24 on September 12 in the United States and Canada. Players aged 18 or over receive one shield per calendar month. Support can verify usage in the activity feed but cannot grant a replacement.";
  const response = await callApi({ productName: "Blitz", audience: "Players", tone: "Clear and reassuring", brief });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.provider, "Demo engine");
  assert.ok(payload.facts.length >= 3);
  assert.ok(payload.facts.every((fact) => fact.grounded));
  assert.match(payload.artifacts.helpCentre, /# Streak Shield protects/);
  assert.match(payload.artifacts.faq, /Frequently asked questions/);
  assert.match(payload.artifacts.releaseNotes, /Blitz release notes/);
  assert.ok(payload.coverageScore >= 50 && payload.coverageScore <= 100);
});

test("rejects briefs that are too short to ground", async () => {
  const response = await callApi({ productName: "Blitz", audience: "Players", tone: "Clear", brief: "Short note." });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /at least 80 characters/i);
});

test("compares versions and preserves the difference between removed and unclear", async () => {
  const before = "Players receive one Streak Shield per calendar month. The feature is available on iOS in the United States. Legacy export is available from the Profile page. Support chat is available around the clock for eligible players.";
  const after = "Players receive two Streak Shields per calendar month. The feature is available on iOS and Android in the United States and Canada. Legacy export is no longer available from the Profile page. Players receive an in-app notification after a shield is applied.";
  const response = await callApi({ productName: "Blitz", audience: "Players", tone: "Clear and reassuring", before, after }, "/api/compare");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.provider, "Demo engine");
  assert.ok(payload.changes.some((change) => change.type === "changed"));
  assert.ok(payload.changes.some((change) => change.type === "added"));
  assert.ok(payload.changes.some((change) => change.type === "removed"));
  assert.ok(payload.changes.some((change) => change.type === "unclear"));
  assert.ok(payload.changes.every((change) => change.grounded));
  assert.match(payload.artifacts.compareReleaseNotes, /Blitz release notes/);
  assert.match(payload.artifacts.updatedHelpCentre, /Usage allowance/);
});

test("rejects version comparisons without two substantial sources", async () => {
  const response = await callApi({ productName: "Blitz", audience: "Players", tone: "Clear", before: "Short A", after: "Short B" }, "/api/compare");
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /both versions need at least 80 characters/i);
});
