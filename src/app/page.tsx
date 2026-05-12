import Link from "next/link";
import { listLibraryPapers } from "@/lib/paper-store";

const formatSavedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function Home() {
  const papers = listLibraryPapers();

  return (
    <div className="library-shell">
      <main className="library-main">
        <section className="library-hero">
          <p className="library-chip">Translation Library</p>
          <h1 className="library-title">Your Paper Translations</h1>
          <p className="library-subtitle">
            Open any saved translation instantly. No re-translation needed.
          </p>
        </section>

        {papers.length ? (
          <section className="library-grid">
            {papers.map((paper) => (
              <article key={paper.slug} className="library-card">
                <div className="library-card-head">
                  {paper.isCurrent ? (
                    <span className="library-badge">Current Working Copy</span>
                  ) : (
                    <span className="library-badge muted">Saved Snapshot</span>
                  )}
                  <span className="library-time">{formatSavedAt(paper.savedAt)}</span>
                </div>

                <h2>{paper.title}</h2>

                <p className="library-meta">DOI: {paper.doi}</p>
                <p className="library-meta">Sentences: {paper.sentenceCount}</p>
                {paper.sourceUrl ? (
                  <p className="library-source">Source: {paper.sourceUrl}</p>
                ) : null}

                <div className="library-actions">
                  <Link href={`/paper/${paper.slug}`} className="library-open">
                    Open Reader
                  </Link>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="library-empty">
            <h2>No translations saved yet</h2>
            <p>
              Build a paper with <code>bun run build:paper-data</code>, then save it with
              <code> bun run paper:save</code>.
            </p>
            <Link href="/paper/current" className="library-open">
              Open Current Working Copy
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
