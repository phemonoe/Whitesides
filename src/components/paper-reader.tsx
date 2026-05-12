"use client";

import Image from "next/image";
import { Fragment, useMemo, useState } from "react";
import type { FigureEntry, PaperData, SentenceEntry } from "@/types/paper";

type ReaderProps = {
  data: PaperData;
};

const sentenceHasKnownFigure = (
  sentence: SentenceEntry,
  validFigureIds: Set<number>
) => sentence.figureRefs.some((id) => validFigureIds.has(id));

const SUP_TO_PLAIN = new Map<string, string>([
  ["⁰", "0"],
  ["¹", "1"],
  ["²", "2"],
  ["³", "3"],
  ["⁴", "4"],
  ["⁵", "5"],
  ["⁶", "6"],
  ["⁷", "7"],
  ["⁸", "8"],
  ["⁹", "9"],
  ["⁺", "+"],
  ["⁻", "-"],
  ["⁼", "="],
  ["⁽", "("],
  ["⁾", ")"],
  ["ᵃ", "a"],
  ["ᵇ", "b"],
  ["ᶜ", "c"],
  ["ᵈ", "d"],
  ["ᵉ", "e"],
  ["ᶠ", "f"],
  ["ᵍ", "g"],
  ["ʰ", "h"],
  ["ⁱ", "i"],
  ["ʲ", "j"],
  ["ᵏ", "k"],
  ["ˡ", "l"],
  ["ᵐ", "m"],
  ["ⁿ", "n"],
  ["ᵒ", "o"],
  ["ᵖ", "p"],
  ["ʳ", "r"],
  ["ˢ", "s"],
  ["ᵗ", "t"],
  ["ᵘ", "u"],
  ["ᵛ", "v"],
  ["ʷ", "w"],
  ["ˣ", "x"],
  ["ʸ", "y"],
  ["ᶻ", "z"],
  ["ᴬ", "A"],
  ["ᴮ", "B"],
  ["ᴰ", "D"],
  ["ᴱ", "E"],
  ["ᴳ", "G"],
  ["ᴴ", "H"],
  ["ᴵ", "I"],
  ["ᴶ", "J"],
  ["ᴷ", "K"],
  ["ᴸ", "L"],
  ["ᴹ", "M"],
  ["ᴺ", "N"],
  ["ᴼ", "O"],
  ["ᴾ", "P"],
  ["ᴿ", "R"],
  ["ᵀ", "T"],
  ["ᵁ", "U"],
  ["ⱽ", "V"],
  ["ᵂ", "W"],
  ["ᵅ", "α"],
  ["ᵝ", "β"],
  ["ᵞ", "γ"],
  ["ᵟ", "δ"],
  ["ᶿ", "θ"],
  ["ᵠ", "φ"],
  ["ᵡ", "χ"],
  ["⸴", ","],
]);

const SUB_TO_PLAIN = new Map<string, string>([
  ["₀", "0"],
  ["₁", "1"],
  ["₂", "2"],
  ["₃", "3"],
  ["₄", "4"],
  ["₅", "5"],
  ["₆", "6"],
  ["₇", "7"],
  ["₈", "8"],
  ["₉", "9"],
  ["₊", "+"],
  ["₋", "-"],
  ["₌", "="],
  ["₍", "("],
  ["₎", ")"],
  ["ₐ", "a"],
  ["ₑ", "e"],
  ["ₕ", "h"],
  ["ᵢ", "i"],
  ["ⱼ", "j"],
  ["ₖ", "k"],
  ["ₗ", "l"],
  ["ₘ", "m"],
  ["ₙ", "n"],
  ["ₒ", "o"],
  ["ₚ", "p"],
  ["ᵣ", "r"],
  ["ₛ", "s"],
  ["ₜ", "t"],
  ["ᵤ", "u"],
  ["ᵥ", "v"],
  ["ₓ", "x"],
]);

const SUP_CHARS = new Set(SUP_TO_PLAIN.keys());
const SUB_CHARS = new Set(SUB_TO_PLAIN.keys());

type ScriptToken = {
  kind: "text" | "sup" | "sub";
  value: string;
};

const normalizeScript = (raw: string, map: Map<string, string>) =>
  raw
    .split("")
    .map((char) => map.get(char) ?? char)
    .join("");

const parseScriptTokens = (text: string): ScriptToken[] => {
  const tokens: ScriptToken[] = [];
  let index = 0;

  while (index < text.length) {
    const char = text[index];

    if (char === "^") {
      let end = index + 1;
      while (end < text.length && /[0-9A-Za-z,+\-−().]/.test(text[end])) {
        end += 1;
      }
      if (end > index + 1) {
        tokens.push({ kind: "sup", value: text.slice(index + 1, end) });
        index = end;
        continue;
      }
    }

    if (SUP_CHARS.has(char)) {
      let end = index;
      while (end < text.length && SUP_CHARS.has(text[end])) {
        end += 1;
      }
      tokens.push({
        kind: "sup",
        value: normalizeScript(text.slice(index, end), SUP_TO_PLAIN),
      });
      index = end;
      continue;
    }

    if (SUB_CHARS.has(char)) {
      let end = index;
      while (end < text.length && SUB_CHARS.has(text[end])) {
        end += 1;
      }
      tokens.push({
        kind: "sub",
        value: normalizeScript(text.slice(index, end), SUB_TO_PLAIN),
      });
      index = end;
      continue;
    }

    let end = index + 1;
    while (
      end < text.length &&
      text[end] !== "^" &&
      !SUP_CHARS.has(text[end]) &&
      !SUB_CHARS.has(text[end])
    ) {
      end += 1;
    }
    tokens.push({ kind: "text", value: text.slice(index, end) });
    index = end;
  }

  return tokens;
};

const renderScriptText = (text: string) =>
  parseScriptTokens(text).map((token, idx) => {
    if (token.kind === "sup") {
      return (
        <sup key={`sup-${idx}`} className="script-sup">
          {token.value}
        </sup>
      );
    }
    if (token.kind === "sub") {
      return (
        <sub key={`sub-${idx}`} className="script-sub">
          {token.value}
        </sub>
      );
    }
    return <Fragment key={`txt-${idx}`}>{token.value}</Fragment>;
  });

export function PaperReader({ data }: ReaderProps) {
  const [showSource, setShowSource] = useState(false);

  const allSentences = useMemo(
    () =>
      data.sections.flatMap((section) =>
        section.paragraphs.flatMap((paragraph) => paragraph.sentences)
      ),
    [data.sections]
  );

  const [activeSentenceId, setActiveSentenceId] = useState<string | null>(
    allSentences[0]?.id ?? null
  );
  const [activeFigureId, setActiveFigureId] = useState<number | null>(
    data.figures[0]?.id ?? null
  );

  const sentenceById = useMemo(
    () => new Map<string, SentenceEntry>(allSentences.map((item) => [item.id, item])),
    [allSentences]
  );
  const figureById = useMemo(
    () => new Map<number, FigureEntry>(data.figures.map((fig) => [fig.id, fig])),
    [data.figures]
  );
  const validFigureIds = useMemo(() => new Set(figureById.keys()), [figureById]);

  const activeSentence = activeSentenceId
    ? sentenceById.get(activeSentenceId) ?? null
    : null;
  const activeFigure =
    (activeFigureId ? figureById.get(activeFigureId) : null) ??
    data.figures[0] ??
    null;

  const handleSentenceHover = (sentence: SentenceEntry) => {
    setActiveSentenceId(sentence.id);
    const nextFigure = sentence.figureRefs.find((id) => validFigureIds.has(id));
    if (nextFigure) {
      setActiveFigureId(nextFigure);
    }
  };

  return (
    <div className="paper-shell">
      <main className="paper-main">
        <section className="paper-intro">
          <p className="paper-chip">Sentence-by-Sentence Plain Rewrite</p>
          <h1 className="paper-title">{data.meta.title}</h1>
          <p className="paper-subtitle">
            Full-paper translation in reading order. Hover any sentence to sync the
            figure panel.
          </p>
          <div className="paper-meta">
            <span>DOI: {data.meta.doi}</span>
            <span>Sentences: {data.meta.sentenceCount}</span>
            <span>Sections: {data.sections.length}</span>
          </div>
          <label className="source-toggle">
            <input
              type="checkbox"
              checked={showSource}
              onChange={(event) => setShowSource(event.target.checked)}
            />
            Show original source paragraph under each translated paragraph
          </label>
        </section>

        <section className="reader-grid">
          <article className="text-panel">
            {data.sections.map((section) => {
              const sentenceCount = section.paragraphs.reduce(
                (sum, paragraph) => sum + paragraph.sentences.length,
                0
              );
              return (
                <section key={section.id} className="section-block">
                  <header className="section-header">
                    <h2>{section.title}</h2>
                    <span>
                      {section.paragraphs.length} paragraphs • {sentenceCount} sentences
                    </span>
                  </header>

                  {section.paragraphs.map((paragraph) => (
                    <div key={paragraph.id} className="paragraph-block">
                      <p className="paragraph-plain">
                        {paragraph.sentences.map((sentence, index) => {
                          const knownFigureRefs = sentence.figureRefs.filter((id) =>
                            validFigureIds.has(id)
                          );
                          const hasFigure = knownFigureRefs.length > 0;
                          const isActive = sentence.id === activeSentenceId;
                          return (
                            <span
                              key={sentence.id}
                              className={`sentence-inline${isActive ? " is-active" : ""}${
                                hasFigure ? " has-figure" : ""
                              }`}
                              onMouseEnter={() => handleSentenceHover(sentence)}
                              onFocus={() => handleSentenceHover(sentence)}
                              onClick={() => handleSentenceHover(sentence)}
                              tabIndex={hasFigure ? 0 : -1}
                            >
                              {renderScriptText(sentence.plain)}
                              {hasFigure && (
                                <sup className="sentence-fig-ref">
                                  {" "}
                                  [Fig. {knownFigureRefs.join(", ")}]
                                </sup>
                              )}
                              {index < paragraph.sentences.length - 1 ? " " : ""}
                            </span>
                          );
                        })}
                      </p>
                      {showSource && (
                        <p className="paragraph-source">
                          {renderScriptText(
                            paragraph.sentences
                              .map((sentence) => sentence.source)
                              .join(" ")
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                </section>
              );
            })}
          </article>

          <aside className="figure-panel">
            <h2 className="panel-title">Hover Figure Preview</h2>
            {activeFigure ? (
              <article className="figure-card">
                <p className="figure-kicker">Fig. {activeFigure.id}</p>
                <div className="figure-image-wrap">
                  <Image
                    src={activeFigure.image}
                    alt={`Figure ${activeFigure.id}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 34vw"
                    className="figure-image"
                  />
                </div>
                <p className="figure-caption">{activeFigure.caption}</p>
              </article>
            ) : (
              <article className="figure-card figure-empty">
                <p>No figure selected.</p>
              </article>
            )}

            <article className="active-sentence-card">
              <h3>Active Sentence</h3>
              {activeSentence ? (
                <>
                  <p className="active-id">{activeSentence.id}</p>
                  <p className="active-plain">
                    {renderScriptText(activeSentence.plain)}
                  </p>
                  {showSource && (
                    <p className="active-source">
                      {renderScriptText(activeSentence.source)}
                    </p>
                  )}
                  {sentenceHasKnownFigure(activeSentence, validFigureIds) && (
                    <p className="active-refs">
                      Figure refs:{" "}
                      {activeSentence.figureRefs
                        .filter((id) => validFigureIds.has(id))
                        .join(", ")}
                    </p>
                  )}
                </>
              ) : (
                <p className="active-empty">
                  Hover or focus a sentence in the paper to inspect it here.
                </p>
              )}
            </article>
          </aside>
        </section>
      </main>
    </div>
  );
}
