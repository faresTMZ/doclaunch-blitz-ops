"use client";

import { useMemo, useRef, useState } from "react";

type WorkspaceMode = "generate" | "compare";
type ArtifactKey = "helpCentre" | "faq" | "releaseNotes";
type CompareArtifactKey = "compareReleaseNotes" | "updatedHelpCentre";

type Fact = {
  label: string;
  value: string;
  sourceQuote: string;
  grounded: boolean;
};

type GenerationResult = {
  facts: Fact[];
  missingInfo: string[];
  groundingWarnings: string[];
  coverageScore: number;
  provider: string;
  artifacts: Record<ArtifactKey, string>;
};

type ChangeType = "added" | "changed" | "removed" | "unclear";
type ChangeEvidence = { value: string; sourceQuote: string } | null;
type VersionChange = {
  id: string;
  type: ChangeType;
  field: string;
  summary: string;
  before: ChangeEvidence;
  after: ChangeEvidence;
  documentationImpact: string;
  grounded: boolean;
};

type CompareResult = {
  changes: VersionChange[];
  questions: string[];
  groundingWarnings: string[];
  comparisonScore: number;
  provider: string;
  artifacts: Record<CompareArtifactKey, string>;
};

const sampleBrief = `# Streak Shield

Streak Shield protects an eligible player's weekly play streak when they miss one day. It launches with mobile app version 8.24 on September 12 in the United States and Canada.

Players aged 18 or over receive one Streak Shield per calendar month. It is enabled automatically and cannot be saved for a later month. When a player misses a day, the shield is applied at midnight local time and the streak remains active. The activity feed then shows “Streak Shield used”.

Players can check availability from Profile > Rewards > Streak Shield. A used shield cannot be restored or refunded. The feature is not available on Android at launch. Customer Support can verify shield usage in the player's activity feed but cannot manually grant a replacement.`;

const sampleBefore = `# Streak Shield 1.0

Streak Shield protects an eligible player's weekly play streak when they miss one day. It is available on iOS in the United States.

Players aged 18 or over receive one Streak Shield per calendar month. When a player misses a day, the shield is applied at midnight local time and the streak remains active.

Players can check shield availability from Profile > Rewards > Streak Shield. A used shield cannot be restored or refunded. Customer Support can verify shield usage in the activity feed but cannot manually grant a replacement.`;

const sampleAfter = `# Streak Shield 1.1

Streak Shield protects an eligible player's weekly play streak when they miss one day. Starting with mobile app version 8.31, it is available on iOS and Android in the United States and Canada.

Players aged 18 or over receive two Streak Shields per calendar month. When a player misses a day, the shield is applied at midnight local time and the streak remains active. Players now receive an in-app notification after a shield is applied.

Players can check their remaining shields from Profile > Rewards > Streak Shield. A used shield cannot be restored or refunded. Customer Support can verify shield usage in the activity feed but cannot manually grant a replacement.`;

const generationTabs: Array<{ key: ArtifactKey | "sources"; label: string; short: string }> = [
  { key: "helpCentre", label: "Help Centre", short: "Article" },
  { key: "faq", label: "FAQ", short: "FAQ" },
  { key: "releaseNotes", label: "Release notes", short: "Notes" },
  { key: "sources", label: "Evidence map", short: "Evidence" },
];

const compareTabs: Array<{ key: CompareArtifactKey | "changes"; label: string; short: string }> = [
  { key: "changes", label: "Change map", short: "Changes" },
  { key: "compareReleaseNotes", label: "Release notes", short: "Notes" },
  { key: "updatedHelpCentre", label: "Updated article", short: "Article" },
];

export default function Home() {
  const [mode, setMode] = useState<WorkspaceMode>("generate");
  const [productName, setProductName] = useState("Blitz");
  const [audience, setAudience] = useState("Players");
  const [tone, setTone] = useState("Clear and reassuring");
  const [brief, setBrief] = useState("");
  const [beforeBrief, setBeforeBrief] = useState("");
  const [afterBrief, setAfterBrief] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [activeTab, setActiveTab] = useState<ArtifactKey | "sources">("helpCentre");
  const [compareTab, setCompareTab] = useState<CompareArtifactKey | "changes">("changes");
  const [artifacts, setArtifacts] = useState<Record<ArtifactKey, string>>({ helpCentre: "", faq: "", releaseNotes: "" });
  const [compareArtifacts, setCompareArtifacts] = useState<Record<CompareArtifactKey, string>>({ compareReleaseNotes: "", updatedHelpCentre: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = useMemo(() => brief.trim().split(/\s+/).filter(Boolean).length, [brief]);
  const beforeWordCount = useMemo(() => beforeBrief.trim().split(/\s+/).filter(Boolean).length, [beforeBrief]);
  const afterWordCount = useMemo(() => afterBrief.trim().split(/\s+/).filter(Boolean).length, [afterBrief]);
  const changeCounts = useMemo(() => {
    const counts: Record<ChangeType, number> = { added: 0, changed: 0, removed: 0, unclear: 0 };
    compareResult?.changes.forEach((change) => { counts[change.type] += 1; });
    return counts;
  }, [compareResult]);

  const switchMode = (nextMode: WorkspaceMode) => {
    setMode(nextMode);
    setError("");
    setCopied(false);
  };

  const loadExample = () => {
    setProductName("Blitz");
    setAudience("Players");
    setTone("Clear and reassuring");
    setBrief(sampleBrief);
    setResult(null);
    setError("");
  };

  const loadCompareExample = () => {
    setProductName("Blitz");
    setAudience("Players");
    setTone("Clear and reassuring");
    setBeforeBrief(sampleBefore);
    setAfterBrief(sampleAfter);
    setUploadedFileName("");
    setCompareResult(null);
    setError("");
  };

  const importCurrentDocumentation = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["md", "txt", "html", "htm"].includes(extension)) {
      setError("Choose a Markdown, text, or HTML documentation file.");
      event.target.value = "";
      return;
    }
    if (file.size > 1_000_000) {
      setError("Choose a documentation file smaller than 1 MB for this local MVP.");
      event.target.value = "";
      return;
    }

    try {
      const rawContent = await file.text();
      const content = extension === "html" || extension === "htm"
        ? new DOMParser().parseFromString(rawContent, "text/html").body.innerText
        : rawContent;
      if (content.trim().length < 20) throw new Error("The selected file does not contain enough readable text.");
      setBeforeBrief(content.trim());
      setUploadedFileName(file.name);
      setCompareResult(null);
      setError("");
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "Unable to read this documentation file.");
    } finally {
      event.target.value = "";
    }
  };

  const useLastGeneratedArticle = () => {
    if (!artifacts.helpCentre) return;
    setBeforeBrief(artifacts.helpCentre);
    setUploadedFileName("Last generated Help Centre article");
    setCompareResult(null);
    setError("");
  };

  const generate = async () => {
    if (brief.trim().length < 80) {
      setError("Add a little more release context so the documentation can stay grounded.");
      return;
    }
    setLoading(true);
    setError("");
    setCopied(false);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productName, audience, tone, brief }),
      });
      const payload = (await response.json()) as GenerationResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Generation failed.");
      setResult(payload);
      setArtifacts(payload.artifacts);
      setActiveTab("helpCentre");
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const compareVersions = async () => {
    if (beforeBrief.trim().length < 80 || afterBrief.trim().length < 80) {
      setError("Both versions need enough context to produce a reliable comparison.");
      return;
    }
    setLoading(true);
    setError("");
    setCopied(false);
    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productName, audience, tone, before: beforeBrief, after: afterBrief }),
      });
      const payload = (await response.json()) as CompareResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Comparison failed.");
      setCompareResult(payload);
      setCompareArtifacts(payload.artifacts);
      setCompareTab("changes");
    } catch (comparisonError) {
      setError(comparisonError instanceof Error ? comparisonError.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const currentArtifact = mode === "generate"
    ? activeTab === "sources" ? "" : artifacts[activeTab]
    : compareTab === "changes" ? "" : compareArtifacts[compareTab];

  const currentFilename = mode === "generate"
    ? activeTab === "sources" ? "evidence-map" : activeTab.replace(/([A-Z])/g, "-$1").toLowerCase()
    : compareTab === "changes" ? "change-map" : compareTab.replace(/([A-Z])/g, "-$1").toLowerCase();

  const copyArtifact = async () => {
    if (!currentArtifact) return;
    await navigator.clipboard.writeText(currentArtifact);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const downloadArtifact = () => {
    if (!currentArtifact) return;
    const blob = new Blob([currentArtifact], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentFilename}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="DocLaunch home"><span className="brand-mark">D</span><span>DocLaunch</span></a>
        <div className="topbar-meta"><span className="status-dot" aria-hidden="true" />Source-grounded workspace<span className="case-pill">Case study · Option B</span></div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span>01</span> Release documentation, without the guesswork</div>
        <div className="hero-grid">
          <div><h1>Turn product context into <em>support-ready</em> documentation.</h1></div>
          <div className="hero-copy">
            <p>Generate a release pack from one feature brief—or compare two product versions and update only what changed.</p>
            <div className="hero-proof"><span><strong>3</strong> deliverables</span><span><strong>2</strong> workflows</span><span><strong>0</strong> silent assumptions</span></div>
          </div>
        </div>
      </section>

      <section className="workspace" aria-label="Documentation workspace">
        <div className="workspace-heading">
          <div><span className="section-kicker">Workspace</span><h2>{mode === "generate" ? "Build a release pack" : "Compare documentation or product versions"}</h2></div>
          <p>{mode === "generate" ? "Paste what the team knows. DocLaunch makes the gaps visible." : "See what changed, what disappeared, and what still needs confirmation."}</p>
        </div>

        <div className="mode-switch" role="tablist" aria-label="Choose documentation workflow">
          <button type="button" role="tab" aria-selected={mode === "generate"} className={mode === "generate" ? "active" : ""} onClick={() => switchMode("generate")}>
            <span>01</span><strong>Generate from specification</strong><small>Create a complete release pack</small>
          </button>
          <button type="button" role="tab" aria-selected={mode === "compare"} className={mode === "compare" ? "active" : ""} onClick={() => switchMode("compare")}>
            <span>02</span><strong>Compare versions</strong><small>Map changes and update docs</small>
          </button>
        </div>

        <div className={`workspace-grid ${mode === "compare" ? "compare-workspace" : ""}`}>
          <section className="input-panel" aria-labelledby="source-title">
            <div className="panel-heading">
              <div><span className="step-number">01</span><h3 id="source-title">{mode === "generate" ? "Source context" : "Version context"}</h3></div>
              <button className="text-button" type="button" onClick={mode === "generate" ? loadExample : loadCompareExample}>
                Load fictional example
              </button>
            </div>
            <div className="fictional-note"><span aria-hidden="true">i</span> Sample data is fictional and created only for this case study.</div>

            <div className="field-row">
              <label><span>Product</span><input value={productName} onChange={(event) => setProductName(event.target.value)} /></label>
              <label><span>Audience</span><select value={audience} onChange={(event) => setAudience(event.target.value)}><option>Players</option><option>Customer support agents</option><option>Administrators</option><option>All customers</option></select></label>
            </div>
            <label className="full-field"><span>Tone</span><select value={tone} onChange={(event) => setTone(event.target.value)}><option>Clear and reassuring</option><option>Concise and direct</option><option>Warm and conversational</option><option>Technical and precise</option></select></label>

            {mode === "generate" ? (
              <>
                <label className="brief-field"><span>Feature specification</span><textarea value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Paste a feature brief, launch memo, or product specification…" aria-describedby="brief-help" /></label>
                <div className="field-footer" id="brief-help"><span>{wordCount} words</span><span>Specific dates, limits, and eligibility improve coverage.</span></div>
              </>
            ) : (
              <div className="version-fields">
                <div className="document-import">
                  <div className="import-heading"><span>Current customer support documentation</span><small>Version A</small></div>
                  <div className="import-actions">
                    <button type="button" onClick={() => fileInputRef.current?.click()}><span aria-hidden="true">↑</span> Upload current documentation</button>
                    <button type="button" disabled={!artifacts.helpCentre} onClick={useLastGeneratedArticle}><span aria-hidden="true">↺</span> Use last generated article</button>
                  </div>
                  <input ref={fileInputRef} className="visually-hidden" type="file" accept=".md,.txt,.html,.htm,text/markdown,text/plain,text/html" onChange={importCurrentDocumentation} aria-label="Upload current customer support documentation" />
                  <p>Markdown, text, or HTML · 1 MB maximum · read locally, never stored</p>
                  {uploadedFileName && <div className="file-status"><span aria-hidden="true">✓</span><div><strong>{uploadedFileName}</strong><small>Loaded into Version A</small></div><button type="button" onClick={() => { setBeforeBrief(""); setUploadedFileName(""); setCompareResult(null); }} aria-label="Remove imported documentation">×</button></div>}
                </div>
                <div className="paste-divider"><span>or paste and edit</span></div>
                <label className="brief-field"><span><b>A</b> Current documentation or specification</span><textarea value={beforeBrief} onChange={(event) => { setBeforeBrief(event.target.value); setUploadedFileName(""); }} placeholder="Upload a file above or paste the current documentation…" aria-describedby="before-help" /></label>
                <div className="field-footer" id="before-help"><span>{beforeWordCount} words</span><span>Baseline</span></div>
                <label className="brief-field"><span><b>B</b> Updated documentation or specification</span><textarea value={afterBrief} onChange={(event) => setAfterBrief(event.target.value)} placeholder="Paste the updated documentation or new feature specification…" aria-describedby="after-help" /></label>
                <div className="field-footer" id="after-help"><span>{afterWordCount} words</span><span>Proposed release</span></div>
              </div>
            )}

            {error && <div className="error-message" role="alert">{error}</div>}
            <button className="primary-button" type="button" onClick={mode === "generate" ? generate : compareVersions} disabled={loading}>
              <span>{loading ? mode === "generate" ? "Building release pack…" : "Comparing versions…" : mode === "generate" ? "Generate release pack" : "Compare versions"}</span><span aria-hidden="true">↗</span>
            </button>
          </section>

          <section className={`output-panel ${(mode === "generate" ? result : compareResult) ? "has-result" : ""}`} aria-labelledby="output-title">
            {mode === "generate" ? (
              !result ? (
                <EmptyState mode="generate" onExample={loadExample} />
              ) : (
                <>
                  <div className="result-summary">
                    <div className="score-ring" style={{ "--score": `${result.coverageScore * 3.6}deg` } as React.CSSProperties}><span>{result.coverageScore}<small>%</small></span></div>
                    <div><span className="section-kicker">Release readiness</span><h3 id="output-title">Strong source coverage</h3><p>{result.facts.length} facts mapped · {result.missingInfo.length} open questions · {result.provider}</p></div>
                    <QualityBadge warnings={result.groundingWarnings.length} />
                  </div>
                  <div className="tab-row" role="tablist" aria-label="Generated documents">
                    {generationTabs.map((tab) => <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key} className={activeTab === tab.key ? "active" : ""} onClick={() => setActiveTab(tab.key)}><span className="tab-long">{tab.label}</span><span className="tab-short">{tab.short}</span></button>)}
                  </div>
                  {activeTab === "sources" ? (
                    <EvidenceMap result={result} />
                  ) : (
                    <DocumentEditor label={activeTab} value={artifacts[activeTab]} copied={copied} onCopy={copyArtifact} onDownload={downloadArtifact} onChange={(value) => setArtifacts({ ...artifacts, [activeTab]: value })} />
                  )}
                </>
              )
            ) : (
              !compareResult ? (
                <EmptyState mode="compare" onExample={loadCompareExample} />
              ) : (
                <>
                  <div className="result-summary compare-result-summary">
                    <div className="score-ring" style={{ "--score": `${compareResult.comparisonScore * 3.6}deg` } as React.CSSProperties}><span>{compareResult.changes.length}<small>∆</small></span></div>
                    <div><span className="section-kicker">Version impact</span><h3 id="output-title">Change set mapped</h3><p>{changeCounts.added} added · {changeCounts.changed} changed · {changeCounts.removed} removed · {changeCounts.unclear} unclear · {compareResult.provider}</p></div>
                    <QualityBadge warnings={compareResult.groundingWarnings.length} />
                  </div>
                  <div className="tab-row compare-tabs" role="tablist" aria-label="Version comparison outputs">
                    {compareTabs.map((tab) => <button key={tab.key} type="button" role="tab" aria-selected={compareTab === tab.key} className={compareTab === tab.key ? "active" : ""} onClick={() => setCompareTab(tab.key)}><span className="tab-long">{tab.label}</span><span className="tab-short">{tab.short}</span></button>)}
                  </div>
                  {compareTab === "changes" ? (
                    <ChangeMap result={compareResult} onApply={() => setCompareTab("updatedHelpCentre")} />
                  ) : (
                    <DocumentEditor label={compareTab} value={compareArtifacts[compareTab]} copied={copied} onCopy={copyArtifact} onDownload={downloadArtifact} onChange={(value) => setCompareArtifacts({ ...compareArtifacts, [compareTab]: value })} />
                  )}
                </>
              )
            )}
          </section>
        </div>
      </section>

      <section className="principles">
        <div className="principles-intro"><span className="section-kicker">Built for trust</span><h2>Good documentation says what is known—and what is not.</h2></div>
        <div className="principle-list">
          <article><span>01</span><h3>Shared facts</h3><p>Every deliverable starts from the same structured evidence map.</p></article>
          <article><span>02</span><h3>Safe diffs</h3><p>Missing information is marked unclear, never silently treated as removed.</p></article>
          <article><span>03</span><h3>Human control</h3><p>Everything stays editable, reviewable, and ready to export.</p></article>
        </div>
      </section>

      <footer><div className="brand"><span className="brand-mark">D</span><span>DocLaunch</span></div><p>From feature brief to support-ready release pack.</p><span>Blitz Operations Engineer · Product Builder</span></footer>
    </main>
  );
}

function EmptyState({ mode, onExample }: { mode: WorkspaceMode; onExample: () => void }) {
  return (
    <div className="empty-state">
      <div className={`empty-stack ${mode === "compare" ? "compare-stack" : ""}`} aria-hidden="true"><span>{mode === "compare" ? "Version A" : "Help Centre"}</span><span>{mode === "compare" ? "Version B" : "FAQ"}</span><span>{mode === "compare" ? "Change map" : "Release notes"}</span></div>
      <span className="step-number">02</span>
      <h3 id="output-title">{mode === "generate" ? "Your release pack will appear here" : "Your version impact will appear here"}</h3>
      <p>{mode === "generate" ? "Start with the fictional example or paste your own feature specification." : "Compare the fictional versions to see grounded changes, questions, and updated documentation."}</p>
      <button className="secondary-button" type="button" onClick={onExample}>Explore the fictional example</button>
    </div>
  );
}

function QualityBadge({ warnings }: { warnings: number }) {
  return <div className={`quality-badge ${warnings ? "needs-review" : ""}`}><span aria-hidden="true">{warnings ? "!" : "✓"}</span>{warnings ? "Review needed" : "Grounding checked"}</div>;
}

function DocumentEditor({ label, value, copied, onCopy, onDownload, onChange }: { label: string; value: string; copied: boolean; onCopy: () => void; onDownload: () => void; onChange: (value: string) => void }) {
  return (
    <div className="document-area" role="tabpanel">
      <div className="document-toolbar"><span>Editable Markdown</span><div><button type="button" onClick={onCopy}>{copied ? "Copied" : "Copy"}</button><button type="button" onClick={onDownload}>Download .md</button></div></div>
      <textarea className="artifact-editor" aria-label={`Edit ${label}`} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function EvidenceMap({ result }: { result: GenerationResult }) {
  return (
    <div className="source-map" role="tabpanel">
      <div className="source-section">
        <div className="source-title-row"><h4>Verified evidence map</h4><span>{result.facts.filter((fact) => fact.grounded).length}/{result.facts.length} grounded</span></div>
        <div className="fact-list">{result.facts.map((fact, index) => <article className="fact-card" key={`${fact.label}-${index}`}><div><span className={fact.grounded ? "fact-status" : "fact-status warning"}>{fact.grounded ? "Verified" : "Review"}</span><h5>{fact.label}</h5><p>{fact.value}</p></div><blockquote>“{fact.sourceQuote}”</blockquote></article>)}</div>
      </div>
      <div className="questions-card"><span className="questions-label">Needs confirmation</span><h4>Questions before publishing</h4><ol>{result.missingInfo.map((question) => <li key={question}>{question}</li>)}</ol></div>
      {result.groundingWarnings.length > 0 && <WarningsCard warnings={result.groundingWarnings} />}
    </div>
  );
}

function ChangeMap({ result, onApply }: { result: CompareResult; onApply: () => void }) {
  return (
    <div className="change-map" role="tabpanel">
      <div className="change-map-toolbar"><div><h4>Grounded version changes</h4><span>Absence alone is classified as unclear—not removed.</span></div><button type="button" onClick={onApply}>View updated article <span aria-hidden="true">→</span></button></div>
      <div className="change-list">
        {result.changes.map((change) => (
          <article className="change-card" key={change.id}>
            <div className="change-card-heading"><span className={`change-type ${change.type}`}>{change.type}</span><div><h5>{change.field}</h5><p>{change.summary}</p></div><span className={change.grounded ? "fact-status" : "fact-status warning"}>{change.grounded ? "Verified" : "Review"}</span></div>
            <div className="evidence-pair">
              <div className={!change.before ? "empty-evidence" : ""}><span>Version A</span><p>{change.before?.value || "Not present in Version A"}</p>{change.before && <blockquote>“{change.before.sourceQuote}”</blockquote>}</div>
              <div className={!change.after ? "empty-evidence" : ""}><span>Version B</span><p>{change.after?.value || (change.type === "unclear" ? "Not mentioned in Version B" : "Explicitly removed")}</p>{change.after && <blockquote>“{change.after.sourceQuote}”</blockquote>}</div>
            </div>
            <div className="impact-line"><span>Documentation impact</span><p>{change.documentationImpact}</p></div>
          </article>
        ))}
      </div>
      {result.questions.length > 0 && <div className="questions-card compare-questions"><span className="questions-label">Needs confirmation</span><h4>Questions before applying the update</h4><ol>{result.questions.map((question) => <li key={question}>{question}</li>)}</ol></div>}
      {result.groundingWarnings.length > 0 && <WarningsCard warnings={result.groundingWarnings} />}
    </div>
  );
}

function WarningsCard({ warnings }: { warnings: string[] }) {
  return <div className="warnings-card"><span className="warnings-label">Grounding review</span><h4>Potential unsupported details</h4><ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>;
}
