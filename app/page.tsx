"use client";

import { useMemo, useState } from "react";

type Fact = {
  label: string;
  value: string;
  sourceQuote: string;
  grounded: boolean;
};

type ArtifactKey = "helpCentre" | "faq" | "releaseNotes";

type GenerationResult = {
  facts: Fact[];
  missingInfo: string[];
  groundingWarnings: string[];
  coverageScore: number;
  provider: string;
  artifacts: Record<ArtifactKey, string>;
};

const sampleBrief = `# Streak Shield

Streak Shield protects an eligible player's weekly play streak when they miss one day. It launches with mobile app version 8.24 on September 12 in the United States and Canada.

Players aged 18 or over receive one Streak Shield per calendar month. It is enabled automatically and cannot be saved for a later month. When a player misses a day, the shield is applied at midnight local time and the streak remains active. The activity feed then shows “Streak Shield used”.

Players can check availability from Profile > Rewards > Streak Shield. A used shield cannot be restored or refunded. The feature is not available on Android at launch. Customer Support can verify shield usage in the player's activity feed but cannot manually grant a replacement.`;

const tabs: Array<{ key: ArtifactKey | "sources"; label: string; short: string }> = [
  { key: "helpCentre", label: "Help Centre", short: "Article" },
  { key: "faq", label: "FAQ", short: "FAQ" },
  { key: "releaseNotes", label: "Release notes", short: "Notes" },
  { key: "sources", label: "Source map", short: "Sources" },
];

export default function Home() {
  const [productName, setProductName] = useState("Blitz");
  const [audience, setAudience] = useState("Players");
  const [tone, setTone] = useState("Clear and reassuring");
  const [brief, setBrief] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [activeTab, setActiveTab] = useState<ArtifactKey | "sources">("helpCentre");
  const [artifacts, setArtifacts] = useState<Record<ArtifactKey, string>>({
    helpCentre: "",
    faq: "",
    releaseNotes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const wordCount = useMemo(
    () => brief.trim().split(/\s+/).filter(Boolean).length,
    [brief],
  );

  const loadExample = () => {
    setProductName("Blitz");
    setAudience("Players");
    setTone("Clear and reassuring");
    setBrief(sampleBrief);
    setResult(null);
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
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const currentArtifact = activeTab === "sources" ? "" : artifacts[activeTab];

  const copyArtifact = async () => {
    if (!currentArtifact) return;
    await navigator.clipboard.writeText(currentArtifact);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const downloadArtifact = () => {
    if (!currentArtifact || activeTab === "sources") return;
    const blob = new Blob([currentArtifact], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeTab.replace(/([A-Z])/g, "-$1").toLowerCase()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="DocLaunch home">
          <span className="brand-mark">D</span>
          <span>DocLaunch</span>
        </a>
        <div className="topbar-meta">
          <span className="status-dot" aria-hidden="true" />
          Source-grounded workspace
          <span className="case-pill">Case study · Option B</span>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span>01</span> Release documentation, without the guesswork</div>
        <div className="hero-grid">
          <div>
            <h1>Turn product context into <em>support-ready</em> documentation.</h1>
          </div>
          <div className="hero-copy">
            <p>
              One feature brief becomes a consistent Help Centre article, FAQ, and release note—
              with open questions surfaced before customers find them.
            </p>
            <div className="hero-proof">
              <span><strong>3</strong> deliverables</span>
              <span><strong>1</strong> shared fact base</span>
              <span><strong>0</strong> silent assumptions</span>
            </div>
          </div>
        </div>
      </section>

      <section className="workspace" aria-label="Documentation generator">
        <div className="workspace-heading">
          <div>
            <span className="section-kicker">Workspace</span>
            <h2>Build a release pack</h2>
          </div>
          <p>Paste what the team knows. DocLaunch makes the gaps visible.</p>
        </div>

        <div className="workspace-grid">
          <section className="input-panel" aria-labelledby="source-title">
            <div className="panel-heading">
              <div>
                <span className="step-number">01</span>
                <h3 id="source-title">Source context</h3>
              </div>
              <button className="text-button" type="button" onClick={loadExample}>
                Load Blitz example
              </button>
            </div>

            <div className="field-row">
              <label>
                <span>Product</span>
                <input value={productName} onChange={(event) => setProductName(event.target.value)} />
              </label>
              <label>
                <span>Audience</span>
                <select value={audience} onChange={(event) => setAudience(event.target.value)}>
                  <option>Players</option>
                  <option>Customer support agents</option>
                  <option>Administrators</option>
                  <option>All customers</option>
                </select>
              </label>
            </div>

            <label className="full-field">
              <span>Tone</span>
              <select value={tone} onChange={(event) => setTone(event.target.value)}>
                <option>Clear and reassuring</option>
                <option>Concise and direct</option>
                <option>Warm and conversational</option>
                <option>Technical and precise</option>
              </select>
            </label>

            <label className="brief-field">
              <span>Feature specification</span>
              <textarea
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                placeholder="Paste a feature brief, launch memo, or product specification…"
                aria-describedby="brief-help"
              />
            </label>
            <div className="field-footer" id="brief-help">
              <span>{wordCount} words</span>
              <span>Specific dates, limits, and eligibility improve coverage.</span>
            </div>

            {error && <div className="error-message" role="alert">{error}</div>}

            <button className="primary-button" type="button" onClick={generate} disabled={loading}>
              <span>{loading ? "Building release pack…" : "Generate release pack"}</span>
              <span aria-hidden="true">↗</span>
            </button>
          </section>

          <section className={`output-panel ${result ? "has-result" : ""}`} aria-labelledby="output-title">
            {!result ? (
              <div className="empty-state">
                <div className="empty-stack" aria-hidden="true">
                  <span>Help Centre</span>
                  <span>FAQ</span>
                  <span>Release notes</span>
                </div>
                <span className="step-number">02</span>
                <h3 id="output-title">Your release pack will appear here</h3>
                <p>Start with the Blitz example or paste your own feature specification.</p>
                <button className="secondary-button" type="button" onClick={loadExample}>
                  Explore the example
                </button>
              </div>
            ) : (
              <>
                <div className="result-summary">
                  <div className="score-ring" style={{ "--score": `${result.coverageScore * 3.6}deg` } as React.CSSProperties}>
                    <span>{result.coverageScore}<small>%</small></span>
                  </div>
                  <div>
                    <span className="section-kicker">Release readiness</span>
                    <h3 id="output-title">Strong source coverage</h3>
                    <p>{result.facts.length} facts mapped · {result.missingInfo.length} open questions · {result.provider}</p>
                  </div>
                  <div className={`quality-badge ${result.groundingWarnings.length ? "needs-review" : ""}`}>
                    <span aria-hidden="true">{result.groundingWarnings.length ? "!" : "✓"}</span>
                    {result.groundingWarnings.length ? "Review needed" : "Grounding checked"}
                  </div>
                </div>

                <div className="tab-row" role="tablist" aria-label="Generated documents">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.key}
                      className={activeTab === tab.key ? "active" : ""}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      <span className="tab-long">{tab.label}</span>
                      <span className="tab-short">{tab.short}</span>
                    </button>
                  ))}
                </div>

                {activeTab === "sources" ? (
                  <div className="source-map" role="tabpanel">
                    <div className="source-section">
                      <div className="source-title-row">
                        <h4>Verified fact map</h4>
                        <span>{result.facts.filter((fact) => fact.grounded).length}/{result.facts.length} grounded</span>
                      </div>
                      <div className="fact-list">
                        {result.facts.map((fact, index) => (
                          <article className="fact-card" key={`${fact.label}-${index}`}>
                            <div>
                              <span className={fact.grounded ? "fact-status" : "fact-status warning"}>
                                {fact.grounded ? "Verified" : "Review"}
                              </span>
                              <h5>{fact.label}</h5>
                              <p>{fact.value}</p>
                            </div>
                            <blockquote>“{fact.sourceQuote}”</blockquote>
                          </article>
                        ))}
                      </div>
                    </div>
                    <div className="questions-card">
                      <span className="questions-label">Needs confirmation</span>
                      <h4>Questions before publishing</h4>
                      <ol>
                        {result.missingInfo.map((question) => <li key={question}>{question}</li>)}
                      </ol>
                    </div>
                    {result.groundingWarnings.length > 0 && (
                      <div className="warnings-card">
                        <span className="warnings-label">Grounding review</span>
                        <h4>Potential unsupported details</h4>
                        <ul>
                          {result.groundingWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="document-area" role="tabpanel">
                    <div className="document-toolbar">
                      <span>Editable Markdown</span>
                      <div>
                        <button type="button" onClick={copyArtifact}>{copied ? "Copied" : "Copy"}</button>
                        <button type="button" onClick={downloadArtifact}>Download .md</button>
                      </div>
                    </div>
                    <textarea
                      className="artifact-editor"
                      aria-label={`Edit ${activeTab}`}
                      value={artifacts[activeTab]}
                      onChange={(event) => setArtifacts({ ...artifacts, [activeTab]: event.target.value })}
                    />
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </section>

      <section className="principles">
        <div className="principles-intro">
          <span className="section-kicker">Built for trust</span>
          <h2>Good documentation says what is known—and what is not.</h2>
        </div>
        <div className="principle-list">
          <article><span>01</span><h3>Shared facts</h3><p>Every deliverable starts from the same structured source map.</p></article>
          <article><span>02</span><h3>Visible gaps</h3><p>Missing launch details become questions, never silent assumptions.</p></article>
          <article><span>03</span><h3>Human control</h3><p>Everything stays editable, reviewable, and ready to export.</p></article>
        </div>
      </section>

      <footer>
        <div className="brand"><span className="brand-mark">D</span><span>DocLaunch</span></div>
        <p>From feature brief to support-ready release pack.</p>
        <span>Blitz Operations Engineer · Product Builder</span>
      </footer>
    </main>
  );
}
