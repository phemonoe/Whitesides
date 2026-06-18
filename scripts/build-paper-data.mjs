import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { deflateSync, inflateSync } from "node:zlib";
import * as cheerio from "cheerio";

const ARTICLE_URL =
  process.env.PAPER_URL ?? "https://www.nature.com/articles/s41586-021-03819-2";
const PAPER_PDF = process.env.PAPER_PDF?.trim() ?? "";
const PAPER_SOURCE_URL = process.env.PAPER_SOURCE_URL?.trim() ?? "";
const outputJson = path.join(process.cwd(), "src", "data", "paper-data.json");
const manualTranslationsPath =
  process.env.MANUAL_TRANSLATIONS_PATH?.trim() ||
  path.join(process.cwd(), "src", "data", "manual-translations.tsv");
const paragraphPassesPath =
  process.env.PARAGRAPH_PASSES_PATH?.trim() ||
  path.join(process.cwd(), "src", "data", "paragraph-passes.json");

const INCLUDED_SECTION_IDS = [
  "Abs1-section",
  "Sec1-section",
  "Sec2-section",
  "Sec3-section",
  "Sec4-section",
  "Sec5-section",
  "Sec6-section",
  "Sec7-section",
  "Sec8-section",
  "Sec9-section",
  "Sec10-section",
  "data-availability-section",
  "code-availability-section",
];

const clean = (text) => text.replace(/\s+/g, " ").trim();
const slugify = (value) =>
  clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const stripPdfPageNumberArtifacts = (text) =>
  clean(
    text
      .replace(/([.!?])\s+\d{1,2}\s+(?=\d+\.)/g, "$1 ")
      .replace(/(\b[A-Za-z)\]])\s+\d{1,2}\s+(?=[a-z])/g, "$1 ")
      .replace(/(\b[A-Za-z)\]])\s+\d{1,2}\s+(?=[A-Z][a-z])/g, "$1 ")
      .replace(/(\b[A-Za-z)\]])\s+\d{1,2}\s+–/g, "$1 –")
      .replace(/,\s+\d{1,2}\s+(?=[A-Z][a-z])/g, ", ")
      .replace(/\s+\d{1,2}$/g, "")
  );

const SUPERSCRIPT_MAP = new Map([
  ["0", "⁰"],
  ["1", "¹"],
  ["2", "²"],
  ["3", "³"],
  ["4", "⁴"],
  ["5", "⁵"],
  ["6", "⁶"],
  ["7", "⁷"],
  ["8", "⁸"],
  ["9", "⁹"],
  ["+", "⁺"],
  ["-", "⁻"],
  ["=", "⁼"],
  ["(", "⁽"],
  [")", "⁾"],
  [",", "⸴"],
  [".", "."],
  [":", ":"],
  [";", ";"],
  ["/", "/"],
  [" ", ""],
  ["a", "ᵃ"],
  ["b", "ᵇ"],
  ["c", "ᶜ"],
  ["d", "ᵈ"],
  ["e", "ᵉ"],
  ["f", "ᶠ"],
  ["g", "ᵍ"],
  ["h", "ʰ"],
  ["i", "ⁱ"],
  ["j", "ʲ"],
  ["k", "ᵏ"],
  ["l", "ˡ"],
  ["m", "ᵐ"],
  ["n", "ⁿ"],
  ["o", "ᵒ"],
  ["p", "ᵖ"],
  ["r", "ʳ"],
  ["s", "ˢ"],
  ["t", "ᵗ"],
  ["u", "ᵘ"],
  ["v", "ᵛ"],
  ["w", "ʷ"],
  ["x", "ˣ"],
  ["y", "ʸ"],
  ["z", "ᶻ"],
  ["A", "ᴬ"],
  ["B", "ᴮ"],
  ["D", "ᴰ"],
  ["E", "ᴱ"],
  ["G", "ᴳ"],
  ["H", "ᴴ"],
  ["I", "ᴵ"],
  ["J", "ᴶ"],
  ["K", "ᴷ"],
  ["L", "ᴸ"],
  ["M", "ᴹ"],
  ["N", "ᴺ"],
  ["O", "ᴼ"],
  ["P", "ᴾ"],
  ["R", "ᴿ"],
  ["T", "ᵀ"],
  ["U", "ᵁ"],
  ["V", "ⱽ"],
  ["W", "ᵂ"],
  ["n", "ⁿ"],
  ["α", "ᵅ"],
  ["β", "ᵝ"],
  ["γ", "ᵞ"],
  ["δ", "ᵟ"],
  ["θ", "ᶿ"],
  ["φ", "ᵠ"],
  ["χ", "ᵡ"],
]);

const SUBSCRIPT_MAP = new Map([
  ["0", "₀"],
  ["1", "₁"],
  ["2", "₂"],
  ["3", "₃"],
  ["4", "₄"],
  ["5", "₅"],
  ["6", "₆"],
  ["7", "₇"],
  ["8", "₈"],
  ["9", "₉"],
  ["+", "₊"],
  ["-", "₋"],
  ["=", "₌"],
  ["(", "₍"],
  [")", "₎"],
  [",", "⸴"],
  [".", "."],
  [":", ":"],
  [";", ";"],
  ["/", "/"],
  [" ", ""],
  ["a", "ₐ"],
  ["e", "ₑ"],
  ["h", "ₕ"],
  ["i", "ᵢ"],
  ["j", "ⱼ"],
  ["k", "ₖ"],
  ["l", "ₗ"],
  ["m", "ₘ"],
  ["n", "ₙ"],
  ["o", "ₒ"],
  ["p", "ₚ"],
  ["r", "ᵣ"],
  ["s", "ₛ"],
  ["t", "ₜ"],
  ["u", "ᵤ"],
  ["v", "ᵥ"],
  ["x", "ₓ"],
]);

const toScriptText = (text, map, fallbackPrefix) => {
  const raw = clean(text);
  if (!raw) return "";
  let converted = "";
  for (const char of raw) {
    const mapped = map.get(char);
    if (!mapped) {
      return `${fallbackPrefix}${raw}`;
    }
    converted += mapped;
  }
  return converted;
};

const paragraphTextWithScripts = ($, pNode) => {
  const cloned = $(pNode).clone();
  cloned.find("sup").each((_, node) => {
    const value = toScriptText($(node).text(), SUPERSCRIPT_MAP, "^");
    $(node).replaceWith(value);
  });
  cloned.find("sub").each((_, node) => {
    const value = toScriptText($(node).text(), SUBSCRIPT_MAP, "_");
    $(node).replaceWith(value);
  });
  return clean(cloned.text());
};

const splitSentences = (text) => {
  const normalized = clean(text);
  if (!normalized) return [];
  const protectedText = normalized
    .replace(/\bFig\./g, "Fig§")
    .replace(/\bFigs\./g, "Figs§")
    .replace(/\bfig\./g, "fig§")
    .replace(/\bfigs\./g, "figs§")
    .replace(/\bi\.e\./gi, "i§e§")
    .replace(/\be\.g\./gi, "e§g§")
    .replace(/\bD\.\sE\./g, "D§E§")
    .replace(/\bet al\./g, "et al§")
    .replace(/\br\.m\.s\.d\./g, "r§m§s§d§")
    .replace(/\blDDT-Cα\./g, "lDDT-Cα§")
    .replace(/\bpLDDT\./g, "pLDDT§");

  return protectedText
    .split(/(?<=[.!?])\s+(?=[A-Z0-9(])/g)
    .map((sentence) =>
      clean(
        sentence
          .replace(/Fig§/g, "Fig.")
          .replace(/Figs§/g, "Figs.")
          .replace(/fig§/g, "fig.")
          .replace(/figs§/g, "figs.")
          .replace(/i§e§/gi, "i.e.")
          .replace(/e§g§/gi, "e.g.")
          .replace(/D§E§/g, "D. E.")
          .replace(/et al§/g, "et al.")
          .replace(/r§m§s§d§/g, "r.m.s.d.")
          .replace(/lDDT-Cα§/g, "lDDT-Cα.")
          .replace(/pLDDT§/g, "pLDDT.")
      )
    )
    .filter(Boolean);
};

const extractFigureIdFromCaption = (text) => {
  const match = text.match(/\b(?:Fig\.?|Figure)\s*(\d+)/i);
  return match ? Number(match[1]) : null;
};

const PDF_FIGURE_CAPTION_PATTERN =
  /^(?:Fig\.?\s*\d+|Figure\s+\d+)(?:[.:]|\s+)/i;

const isPdfFigureCaption = (text) => PDF_FIGURE_CAPTION_PATTERN.test(text);

const loadManualTranslations = () => {
  if (!fs.existsSync(manualTranslationsPath)) {
    return new Map();
  }
  const raw = fs.readFileSync(manualTranslationsPath, "utf8");
  const map = new Map();
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const tabIndex = line.indexOf("\t");
    if (tabIndex === -1) {
      throw new Error(
        `Invalid translation line in ${manualTranslationsPath}: ${line}`
      );
    }
    const id = line.slice(0, tabIndex).trim();
    const translation = line.slice(tabIndex + 1).trim();
    if (!id || !translation) {
      throw new Error(
        `Invalid translation entry in ${manualTranslationsPath}: ${line}`
      );
    }
    if (map.has(id)) {
      throw new Error(`Duplicate translation id ${id} in ${manualTranslationsPath}`);
    }
    map.set(id, translation);
  }
  return map;
};

const loadParagraphPassTranslations = () => {
  if (!fs.existsSync(paragraphPassesPath)) {
    return null;
  }

  const raw = fs.readFileSync(paragraphPassesPath, "utf8");
  const parsed = JSON.parse(raw);
  const paragraphs = Array.isArray(parsed?.paragraphs) ? parsed.paragraphs : null;

  if (!paragraphs) {
    throw new Error(
      `Invalid paragraph passes file at ${paragraphPassesPath}: missing paragraphs array`
    );
  }

  const map = new Map();

  for (const paragraph of paragraphs) {
    if (!Array.isArray(paragraph?.sentences)) {
      throw new Error(
        `Invalid paragraph entry in ${paragraphPassesPath}: missing sentences array`
      );
    }

    for (const sentence of paragraph.sentences) {
      const id = String(sentence?.id ?? "").trim();
      const plain = String(sentence?.plain ?? "").trim();

      if (!id || !plain) {
        throw new Error(
          `Invalid sentence entry in ${paragraphPassesPath}: each sentence needs id and plain`
        );
      }

      if (map.has(id)) {
        throw new Error(
          `Duplicate translation id ${id} in ${paragraphPassesPath}`
        );
      }

      map.set(id, plain);
    }
  }

  return map;
};

const manualTranslations =
  loadParagraphPassTranslations() ?? loadManualTranslations();
const missingManualIds = [];
const usedManualIds = new Set();

const figureRefsForSource = (source) =>
  Array.from(
    new Set(
      [...source.matchAll(/\bFig\.?\s*(\d+)/gi), ...source.matchAll(/\bFigure\s*(\d+)/gi)]
        .map((match) => Number(match[1]))
        .filter((value) => Number.isFinite(value))
    )
  ).sort((a, b) => a - b);

const buildSectionEntries = (rawSections) => {
  const shouldMergeParagraphs = (previousText, nextText) => {
    if (!previousText || !nextText) {
      return false;
    }

    if (!/[.!?]"?$/.test(previousText)) {
      return true;
    }

    return /^[a-zα-ω]/.test(nextText);
  };

  const sections = [];
  let runningSentenceNumber = 0;

  for (const rawSection of rawSections) {
    const mergedParagraphs = [];
    for (const paragraphText of rawSection.paragraphs) {
      const normalizedParagraph = clean(paragraphText);
      if (!normalizedParagraph) continue;
      const previousText = mergedParagraphs[mergedParagraphs.length - 1];
      if (shouldMergeParagraphs(previousText, normalizedParagraph)) {
        mergedParagraphs[mergedParagraphs.length - 1] = stripPdfPageNumberArtifacts(
          `${previousText} ${normalizedParagraph}`
        );
        continue;
      }
      mergedParagraphs.push(stripPdfPageNumberArtifacts(normalizedParagraph));
    }

    const paragraphs = [];

    mergedParagraphs.forEach((paragraphText, paragraphIndex) => {
      const sentenceTexts = splitSentences(paragraphText);
      if (!sentenceTexts.length) {
        return;
      }

      const sentenceItems = sentenceTexts.map((source) => {
        runningSentenceNumber += 1;
        const sentenceId = `S${String(runningSentenceNumber).padStart(4, "0")}`;
        const figureRefs = figureRefsForSource(source);
        return {
          id: sentenceId,
          source,
          plain: manualTranslations.get(sentenceId) ?? source,
          figureRefs,
        };
      });

      for (const sentence of sentenceItems) {
        if (manualTranslations.size > 0 && !manualTranslations.has(sentence.id)) {
          missingManualIds.push(sentence.id);
        } else if (manualTranslations.has(sentence.id)) {
          usedManualIds.add(sentence.id);
        }
      }

      paragraphs.push({
        id: `${rawSection.id}-PAR${paragraphIndex + 1}`,
        source: paragraphText,
        sentences: sentenceItems,
      });
    });

    if (paragraphs.length > 0) {
      sections.push({
        id: rawSection.id,
        title: rawSection.title,
        paragraphs,
      });
    }
  }

  return { sections, runningSentenceNumber };
};

const SCIENCE_SKIP_LINES = [
  /^Research Article$/i,
  /^PROTEIN SIMULATIONS$/i,
  /^BIOPHYSICS AND COMPUTATIONAL BIOLOGY$/i,
  /^arXiv:\d{4}\.\d{4,5}v\d+\s+\[/i,
  /^Science \d{1,2} [A-Za-z]+ \d{4}$/i,
  /^PNAS\s+\d{4}\s+Vol\.\s+\d+/i,
  /^\d+ of \d+$/i,
  /^Downloaded from https?:\/\/\S+/i,
  /^Downloaded from https:\/\/www\.pnas\.org/i,
  /^Downloaded by guest on /i,
  /^https:\/\/doi\.org\/10\.1073\/pnas/i,
  /^pnas\.org$/i,
  /^PNAS$/i,
  /^Full article and list of$/i,
  /^author affiliations:?$/i,
  /^Author affiliations:?$/i,
  /^View the article online$/i,
  /^Permissions$/i,
  /^Use of this article is subject to the Terms of service$/i,
  /^Science \(ISSN /i,
  /^Copyright ©/i,
  /^Published under the PNAS license\./i,
  /^Published January \d{1,2}, \d{4}\./i,
  /^Edited by /i,
  /^Reviewed by /i,
  /^\(Back to Table of Contents\)$/i,
  /^Scientific Perspective$/i,
  /^Density Functional Theory$/i,
  /^Angewandte$/i,
  /^Chemie$/i,
  /^www\.angewandte\.org$/i,
  /^Angew\. Chem\. \d{4}, \d+, e\d+/i,
  /^Zitierweise:/i,
  /^Internationale Ausgabe:/i,
  /^Deutsche Ausgabe:/i,
  /^© \d{4} The Authors\. Angewandte Chemie published by Wiley-VCH GmbH/i,
  /^15213757, \d{4}, \d+, Downloaded from https:\/\/onlinelibrary\.wiley\.com/i,
];

const PDF_SKIP_PARAGRAPHS = [
  /^Scalable emulation of protein equilibrium ensembles with generative deep learning$/i,
  /^Sarah Lewis, Tim Hempel,/i,
  /^Science 389 \(6761\), eadv9817\./i,
  /^https:\/\/www\.science\.org\/doi\/10\.1126\/science\.adv9817$/i,
  /^https:\/\/www\.science\.org\/help\/reprints-and-permissions$/i,
  /^Protein language models trained on biophysical dynamics inform mutation effects$/i,
  /^Chao Hou, Haiqing Zhao, and Yufeng Shen/i,
  /^Author contributions:/i,
  /^The authors declare no competing interest/i,
  /^This article is a PNAS Direct Submission/i,
  /^Correspondence may be addressed to /i,
  /^This article contains supporting information online/i,
  /^Data, Materials, and Software Availability\./i,
  /^Code & Models \| /i,
  /^General Multimodal Protein Design Enables DNA-Encoding of Chemistry$/i,
  /^Jarrid Rector-Brooks/i,
  /^\d+\s+California Institute of Technology/i,
  /^DISCO$/i,
  /^Contents$/i,
  /^A\.\d+(?:\.\d+)*\s+.+\s+\. \./,
  /^B\.\d+(?:\.\d+)*\s+.+\s+\. \./,
  /^A\s+In silico methods and results\s+\d+$/i,
  /^B\s+In vitro methods and results\s+\d+$/i,
  /^\[\*\]\s+/,
  /^\[\*\*\]\s+/,
  /^Markus Bursch received his PhD/i,
  /^Andreas Hansen received his PhD/i,
  /^Jan-Michael Mewes studied chemistry/i,
  /^Stefan Grimme studied Chemistry/i,
  /^lanthanide-based OLEDs\.$/i,
  /^Scientific Perspective$/i,
  /^Density Functional Theory$/i,
  /^Angewandte$/i,
  /^Chemie$/i,
  /^www\.angewandte\.org$/i,
  /^Angew\. Chem\. \d{4}, \d+, e\d+/i,
  /^Zitierweise:/i,
  /^Internationale Ausgabe:/i,
  /^Deutsche Ausgabe:/i,
  /^© \d{4} The Authors\. Angewandte Chemie published by Wiley-VCH GmbH/i,
  /^15213757, \d{4}, \d+, Downloaded from https:\/\/onlinelibrary\.wiley\.com/i,
  /^\d+$/,
  /^[A-F]$/,
];

const PDF_SECTION_TITLE_OVERRIDES = new Map([
  ["INTRODUCTION", "Summary Introduction"],
  ["RATIONALE", "Summary Rationale"],
  ["RESULTS", "Summary Results"],
  ["CONCLUSION", "Summary Conclusion"],
  ["Model", "Model"],
  [
    "Sampling conformational changes related to protein function",
    "Sampling Conformational Changes Related to Protein Function",
  ],
  ["Emulating MD equilibrium distributions", "Emulating MD Equilibrium Distributions"],
  ["Predicting protein stabilities", "Predicting Protein Stabilities"],
  ["Discussion", "Discussion"],
  ["Results", "Results"],
  ["Methods", "Methods"],
  ["MATERIALS AND METHODS", "Methods"],
  ["Data, Materials, and Software Availability", "Data, Materials, and Software Availability"],
  ["Data, Materials, and Software Availability.", "Data, Materials, and Software Availability"],
  ["ACKNOWLEDGMENTS", "Acknowledgments"],
  ["Acknowledgments", "Acknowledgments"],
  ["Acknowledgements", "Acknowledgements"],
  ["Conflict of Interest", "Conflict of Interest"],
  ["Data Availability Statement", "Data Availability Statement"],
  ["SUPPLEMENTARY MATERIALS", "Supplementary Materials"],
  ["Introduction", "Introduction"],
  ["Multimodal protein generation with D ISCO", "Multimodal Protein Generation with DISCO"],
  ["Conditioning on arbitrary biomolecular contexts", "Conditioning on Arbitrary Biomolecular Contexts"],
  ["Multimodal inference steering using Feynman-Kac Correctors", "Multimodal Inference Steering Using Feynman-Kac Correctors"],
  [
    "D ISCO designs exhibit realistic protein features with novel, complementary motifs",
    "DISCO Designs Exhibit Realistic Protein Features with Novel, Complementary Motifs",
  ],
  [
    "Designing active sites for new-to-nature carbene transfer reactions",
    "Designing Active Sites for New-to-Nature Carbene Transfer Reactions",
  ],
  [
    "Designing enzymes for new-to-nature biocatalysis",
    "Designing Enzymes for New-to-Nature Biocatalysis",
  ],
  [
    "General biomolecular design unlocks new-to-nature reactivities",
    "General Biomolecular Design Unlocks New-to-Nature Reactivities",
  ],
  ["Supplementary Information", "Supplementary Information"],
  ["A In silico methods and results", "A In Silico Methods and Results"],
  ["B In vitro methods and results", "B In Vitro Methods and Results"],
]);

const joinPdfLines = (lines) => {
  let out = "";

  for (const rawLine of lines) {
    const line = clean(
      rawLine
        .replace(/\u00ad/g, "")
        .replace(/\u200b/g, "")
        .replace(/­/g, "")
    );
    if (!line) continue;

    if (!out) {
      out = line;
      continue;
    }

    if (/[([{\/-]$/.test(out) || /^[,.;:!?%)\]}]/.test(line)) {
      out += line;
      continue;
    }

    out += ` ${line}`;
  }

  return clean(out);
};

const isPdfHeading = (text) => {
  if (PDF_SECTION_TITLE_OVERRIDES.has(text)) {
    return true;
  }

  return (
    /^(?:Abstract|Significance|Introduction|Results|Discussion|Methods|Acknowledgments|Acknowledgements|References|Conflict of Interest|Data Availability Statement|Supplementary Information|Supplementary Materials)$/i.test(text) ||
    (!PDF_TOC_LINE_PATTERN.test(text) &&
      /^[A-Z]\.\d+(?:\.\d+)*\s+[A-Z][A-Za-z0-9].+/.test(text)) ||
    /^Appendix:/i.test(text)
  );
};

const parsePdfMetadata = (pdfPath) => {
  const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  const title = clean(info.match(/^Title:[ \t]*([^\r\n]*)$/m)?.[1] ?? "").replace(/\*+$/, "").trim();
  const subject = clean(info.match(/^Subject:[ \t]*([^\r\n]*)$/m)?.[1] ?? "");
  const textHead = execFileSync("pdftotext", [pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const frontMatter = textHead.split("\f").slice(0, 2).join("\n");
  const doi =
    clean(frontMatter.match(/doi\.org\/(10\.\d{4,9}\/[A-Za-z0-9._;()/:+-]+)/i)?.[1] ?? "") ||
    clean(subject.match(/\b(10\.\d{4,9}\/[A-Za-z0-9._;()/:+-]+)/)?.[1] ?? "") ||
    clean(frontMatter.match(/\bDOI:\s*(10\.\d{4,9}\/[A-Za-z0-9._;()/:+-]+)/i)?.[1] ?? "");
  const arxivId = clean(
    frontMatter.match(/\barXiv:(\d{4}\.\d{4,5}v\d+)\b/i)?.[1] ?? ""
  );

  return {
    title,
    doi: doi.replace(/[.)]+$/, ""),
    arxivId,
  };
};

const extractPdfTitleFromText = (rawText) => {
  const candidates = rawText
    .split(/\r?\n/)
    .map((line) => clean(line))
    .filter(Boolean);

  for (const line of candidates) {
    if (
      /^Abstract$/i.test(line) ||
      /^Version\s+\d/i.test(line) ||
      /^\w+\s+\d{1,2},\s+\d{4}$/i.test(line) ||
      /@/.test(line) ||
      /University|Institute|Research/i.test(line) ||
      /^\d+$/.test(line)
    ) {
      continue;
    }
    if (/[A-Za-z]/.test(line) && line.length >= 12) {
      return line;
    }
  }

  return "";
};

const PDF_NUMBER_ONLY_PATTERN = /^\d{1,2}(?:\.\d+)*\.?$/;
const PDF_NUMBERED_HEADING_PATTERN = /^(\d{1,2}(?:\.\d+)*\.?)\s+(.+)$/;
const PDF_TOC_LINE_PATTERN = /\. \. \./;

const isPdfHeadingTitle = (text) => {
  if (!text) {
    return false;
  }
  if (isPdfFigureCaption(text)) {
    return false;
  }
  if (/^(?:Method|Energy|Loss|ŷ Generation)$/i.test(text)) {
    return false;
  }
  if (!/[A-Za-z]/.test(text)) {
    return false;
  }

  const normalized = text.replace(/\.$/, "");
  const words = normalized.split(/\s+/);
  return (
    words.length > 0 &&
    words.length <= 16 &&
    /^[\p{Lu}0-9“"'][\p{L}\p{N}'’“”()[\]\/\-–,:? +.]+\.?$/u.test(text)
  );
};

const isLikelyPdfArtifact = (text) => {
  if (!text) return false;
  if (isPdfHeading(text)) {
    return false;
  }
  if (
    PDF_NUMBER_ONLY_PATTERN.test(text) ||
    PDF_NUMBERED_HEADING_PATTERN.test(text) ||
    /^(?:Abstract|Significance|Results|Discussion|Methods|Acknowledgments)$/i.test(text) ||
    /^Appendix:/i.test(text) ||
    /^Keywords:/i.test(text) ||
    /^Figure\s+\d+[:.]/i.test(text) ||
    /^Fig\.?\s*\d+[:.]/i.test(text)
  ) {
    return false;
  }
  if (/[=<>{}]/.test(text)) {
    return false;
  }
  if (/[.!?;:]$/.test(text)) {
    return false;
  }
  if (/�/.test(text)) {
    return true;
  }

  const words = text.split(/\s+/);
  return words.length <= 8 && text.length <= 80;
};

const normalizePdfBlocks = (page) => {
  const chunks = page
    .split(/\n\s*\n+/)
    .map((chunk) =>
      chunk
        .split("\n")
        .map((line) => line.trim())
        .filter(
          (line) =>
            line &&
            !PDF_TOC_LINE_PATTERN.test(line) &&
            !SCIENCE_SKIP_LINES.some((pattern) => pattern.test(line))
        )
    )
    .filter((lines) => lines.length > 0);

  const blocks = [];
  const chunkToBlocks = (lines) => {
    if (lines.length === 0) {
      return [];
    }

    const splitBlocks = [];
    let pendingLines = [];
    for (const line of lines) {
      const lineText = clean(line);
      const numberedLineHeading = lineText.match(PDF_NUMBERED_HEADING_PATTERN);
      if (
        isPdfHeading(lineText) ||
        (numberedLineHeading && isPdfHeadingTitle(numberedLineHeading[2])) ||
        /^(?:References|REFERENCES AND NOTES)$/i.test(lineText)
      ) {
        if (pendingLines.length > 0) {
          splitBlocks.push(joinPdfLines(pendingLines));
          pendingLines = [];
        }
        splitBlocks.push(lineText);
        continue;
      }
      pendingLines.push(line);
    }

    if (splitBlocks.length > 0) {
      if (pendingLines.length > 0) {
        splitBlocks.push(joinPdfLines(pendingLines));
      }
      return splitBlocks.filter(Boolean);
    }

    const firstLine = clean(lines[0]);
    const remainingLines = lines.slice(1);

    const abstractLineMatch = firstLine.match(/^Abstract:?\s+(.+)$/i);
    if (abstractLineMatch) {
      return [
        "Abstract",
        joinPdfLines([abstractLineMatch[1], ...remainingLines]),
      ];
    }

    if (/^ACKNOWLEDGMENTS\.\s+/i.test(firstLine)) {
      return [
        "Acknowledgments",
        joinPdfLines([firstLine.replace(/^ACKNOWLEDGMENTS\.\s+/i, ""), ...remainingLines]),
      ];
    }

    if (/^Data, Materials, and Software Availability\.\s+/i.test(firstLine)) {
      return [
        "Data, Materials, and Software Availability",
        joinPdfLines([
          firstLine.replace(/^Data, Materials, and Software Availability\.\s+/i, ""),
          ...remainingLines,
        ]),
      ];
    }

    if (
      /^(?:Abstract|Introduction|Results|Discussion|Methods|Acknowledgments|References|REFERENCES AND NOTES|Supplementary Information)$/i.test(firstLine) ||
      (!PDF_TOC_LINE_PATTERN.test(firstLine) &&
        /^[A-Z]\.\d+(?:\.\d+)*\s+[A-Z][A-Za-z0-9].+/.test(firstLine)) ||
      PDF_SECTION_TITLE_OVERRIDES.has(firstLine) ||
      /^Appendix:/i.test(firstLine)
    ) {
      return [
        firstLine,
        ...(remainingLines.length > 0 ? [joinPdfLines(remainingLines)] : []),
      ];
    }

    if (isPdfHeadingTitle(firstLine) && /[.]$/.test(firstLine) && remainingLines.length > 0) {
      return [firstLine, joinPdfLines(remainingLines)];
    }

    if (/^Figure\s+\d+[:.]$/i.test(firstLine) || /^Fig\.?\s*\d+[:.]$/i.test(firstLine)) {
      return [clean(`${firstLine} ${joinPdfLines(remainingLines)}`)];
    }

    return [joinPdfLines(lines)];
  };

  for (let index = 0; index < chunks.length; index += 1) {
    const currentBlocks = chunkToBlocks(chunks[index]);

    for (let blockOffset = 0; blockOffset < currentBlocks.length; blockOffset += 1) {
      let blockText = currentBlocks[blockOffset];
      if (!blockText) {
        continue;
      }

      const nextText =
        blockOffset + 1 < currentBlocks.length
          ? currentBlocks[blockOffset + 1]
          : index + 1 < chunks.length
            ? joinPdfLines(chunks[index + 1])
            : "";

      if (
        PDF_NUMBER_ONLY_PATTERN.test(blockText) &&
        isPdfHeadingTitle(nextText)
      ) {
        blockText = `${blockText} ${nextText}`;
        if (blockOffset + 1 < currentBlocks.length) {
          blockOffset += 1;
        } else {
          index += 1;
        }
      } else if (/^Figure\s+\d+[:.]$/i.test(blockText) && nextText) {
        blockText = `${blockText} ${nextText}`;
        if (blockOffset + 1 < currentBlocks.length) {
          blockOffset += 1;
        } else {
          index += 1;
        }
      }

      if (/^\d+$/.test(blockText)) {
        continue;
      }

      blocks.push(blockText);
    }
  }

  return blocks;
};

const extractPdfFigureCaptionsFromPage = (page) => {
  const lines = page
    .split(/\r?\n/)
    .map((line) =>
      clean(
        line
          .replace(/\u00ad/g, "")
          .replace(/\u200b/g, "")
          .replace(/­/g, "")
      )
    );
  const captions = new Map();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!isPdfFigureCaption(line)) {
      continue;
    }

    const previousNonEmptyLine =
      [...lines.slice(0, index)].reverse().find((candidate) => candidate) ?? "";
    if (/\b(?:and|in|of|to|from|with|shown in|depicted in|summarized in)$/i.test(previousNonEmptyLine)) {
      continue;
    }

    const figureId = extractFigureIdFromCaption(line);
    if (!figureId || captions.has(figureId)) {
      continue;
    }

    const captionLines = [line];
    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextLine = lines[nextIndex];
      const captionText = joinPdfLines(captionLines);

      if (!nextLine) {
        if (/[.!?)]$/.test(captionText)) {
          break;
        }
        continue;
      }

      if (
        isPdfFigureCaption(nextLine) ||
        /^Table\s+\d+/i.test(nextLine) ||
        SCIENCE_SKIP_LINES.some((pattern) => pattern.test(nextLine)) ||
        PDF_NUMBER_ONLY_PATTERN.test(nextLine) ||
        PDF_NUMBERED_HEADING_PATTERN.test(nextLine) ||
        isPdfHeading(nextLine)
      ) {
        break;
      }

      captionLines.push(nextLine);
    }

    captions.set(figureId, joinPdfLines(captionLines));
  }

  return captions;
};

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const PNG_CHANNELS_BY_COLOR_TYPE = new Map([
  [0, 1],
  [2, 3],
  [4, 2],
  [6, 4],
]);

const crc32Table = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const writePngChunk = (type, data) => {
  const typeBuffer = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
};

const paethPredictor = (left, up, upLeft) => {
  const estimate = left + up - upLeft;
  const leftDelta = Math.abs(estimate - left);
  const upDelta = Math.abs(estimate - up);
  const upLeftDelta = Math.abs(estimate - upLeft);
  if (leftDelta <= upDelta && leftDelta <= upLeftDelta) return left;
  if (upDelta <= upLeftDelta) return up;
  return upLeft;
};

const decodePngRows = ({ data, width, height, channels }) => {
  const stride = width * channels;
  const rows = Buffer.alloc(stride * height);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = data[sourceOffset];
    sourceOffset += 1;
    const rowOffset = y * stride;

    for (let x = 0; x < stride; x += 1) {
      const raw = data[sourceOffset];
      sourceOffset += 1;
      const left = x >= channels ? rows[rowOffset + x - channels] : 0;
      const up = y > 0 ? rows[rowOffset + x - stride] : 0;
      const upLeft = y > 0 && x >= channels ? rows[rowOffset + x - stride - channels] : 0;

      let value = raw;
      if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + up;
      else if (filter === 3) value = raw + Math.floor((left + up) / 2);
      else if (filter === 4) value = raw + paethPredictor(left, up, upLeft);
      else if (filter !== 0) return null;

      rows[rowOffset + x] = value & 0xff;
    }
  }

  return rows;
};

const encodePngRows = ({ rows, width, height, channels }) => {
  const stride = width * channels;
  const encoded = Buffer.alloc((stride + 1) * height);
  let offset = 0;

  for (let y = 0; y < height; y += 1) {
    encoded[offset] = 0;
    offset += 1;
    rows.copy(encoded, offset, y * stride, (y + 1) * stride);
    offset += stride;
  }

  return encoded;
};

const parsePng = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return null;
  }

  let offset = PNG_SIGNATURE.length;
  let ihdr = null;
  const chunks = [];
  const idatChunks = [];

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    if (type === "IHDR") ihdr = data;
    if (type === "IDAT") idatChunks.push(data);
    offset += 12 + length;
    if (type === "IEND") break;
  }

  if (!ihdr || !idatChunks.length) {
    return null;
  }

  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];
  const channels = PNG_CHANNELS_BY_COLOR_TYPE.get(colorType);

  if (!channels || bitDepth !== 8 || interlace !== 0) {
    return null;
  }

  const rows = decodePngRows({
    data: inflateSync(Buffer.concat(idatChunks)),
    width,
    height,
    channels,
  });

  return rows ? { chunks, colorType, channels, height, rows, width } : null;
};

const writePng = ({ chunks, height, rows, width, channels }) => {
  const outputChunks = chunks
    .filter((chunk) => chunk.type !== "IDAT" && chunk.type !== "IEND")
    .map((chunk) => writePngChunk(chunk.type, chunk.data));

  outputChunks.push(
    writePngChunk(
      "IDAT",
      deflateSync(encodePngRows({ rows, width, height, channels }))
    ),
    writePngChunk("IEND", Buffer.alloc(0))
  );

  return Buffer.concat([PNG_SIGNATURE, ...outputChunks]);
};

const isNearBlackPixel = ({ rows, offset, colorType, channels }) => {
  if (colorType === 0) {
    return rows[offset] <= 16;
  }

  const red = rows[offset];
  const green = rows[offset + 1];
  const blue = rows[offset + 2];
  const alpha = channels === 4 ? rows[offset + 3] : 255;
  return alpha > 16 && red <= 16 && green <= 16 && blue <= 16;
};

const setPixelToWhite = ({ rows, offset, colorType, channels }) => {
  if (colorType === 0) {
    rows[offset] = 255;
    return;
  }

  rows[offset] = 255;
  rows[offset + 1] = 255;
  rows[offset + 2] = 255;
  if (channels === 4) {
    rows[offset + 3] = 255;
  }
};

const replaceDarkExteriorWithWhite = (filePath) => {
  const png = parsePng(filePath);
  if (!png) {
    return false;
  }

  const { colorType, channels, height, rows, width } = png;
  const visited = new Uint8Array(width * height);
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const pixelIndex = y * width + x;
    if (visited[pixelIndex]) return;
    const offset = pixelIndex * channels;
    if (!isNearBlackPixel({ rows, offset, colorType, channels })) return;
    visited[pixelIndex] = 1;
    queue.push(pixelIndex);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let index = 0; index < queue.length; index += 1) {
    const pixelIndex = queue[index];
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  if (queue.length < Math.max(100, width * height * 0.002)) {
    return false;
  }

  for (const pixelIndex of queue) {
    setPixelToWhite({
      rows,
      offset: pixelIndex * channels,
      colorType,
      channels,
    });
  }

  fs.writeFileSync(filePath, writePng(png));
  return true;
};

const extractPdfEmbeddedImages = (pdfPath) => {
  let imageList = "";
  try {
    imageList = execFileSync("pdfimages", ["-list", pdfPath], {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch {
    return { imagesByPage: new Map(), cleanup: () => {} };
  }

  const imageRows = imageList
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(\d+)\s+(\d+)\b/);
      if (!match) {
        return null;
      }
      return {
        page: Number(match[1]),
        num: Number(match[2]),
        type: match[3],
        width: Number(match[4]),
        height: Number(match[5]),
      };
    })
    .filter(
      (row) =>
        row &&
        row.type === "image" &&
        Number.isFinite(row.page) &&
        Number.isFinite(row.num) &&
        row.width >= 120 &&
        row.height >= 120
    );

  if (!imageRows.length) {
    return { imagesByPage: new Map(), cleanup: () => {} };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "paper-reader-images-"));
  const tmpPrefix = path.join(tmpDir, "image");

  try {
    execFileSync("pdfimages", ["-png", pdfPath, tmpPrefix], {
      stdio: "ignore",
    });
  } catch {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { imagesByPage: new Map(), cleanup: () => {} };
  }

  const imagesByPage = new Map();
  for (const row of imageRows) {
    const filePath = `${tmpPrefix}-${String(row.num).padStart(3, "0")}.png`;
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const pageImages = imagesByPage.get(row.page) ?? [];
    pageImages.push({
      filePath,
      width: row.width,
      height: row.height,
      area: row.width * row.height,
    });
    imagesByPage.set(row.page, pageImages);
  }

  for (const pageImages of imagesByPage.values()) {
    pageImages.sort((a, b) => b.area - a.area);
  }

  return {
    imagesByPage,
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }),
  };
};

const renderPdfEmbeddedFigureImage = (embeddedImage, paperSlug, figureId) => {
  const outDir = path.join(process.cwd(), "public", "figures", paperSlug);
  const outFile = path.join(outDir, `fig-${figureId}.png`);

  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(embeddedImage.filePath, outFile);
  replaceDarkExteriorWithWhite(outFile);

  return {
    image: `/figures/${paperSlug}/fig-${figureId}.png`,
    width: embeddedImage.width,
    height: embeddedImage.height,
  };
};

const renderPdfFigurePage = (pdfPath, paperSlug, pageNumber, figureId) => {
  const outDir = path.join(process.cwd(), "public", "figures", paperSlug);
  const outPrefix = path.join(outDir, `fig-${figureId}`);
  const outFile = `${outPrefix}.png`;

  fs.mkdirSync(outDir, { recursive: true });

  if (!fs.existsSync(outFile)) {
    execFileSync(
      "pdftoppm",
      ["-png", "-singlefile", "-f", String(pageNumber), "-l", String(pageNumber), pdfPath, outPrefix],
      { stdio: "ignore" }
    );
  }

  return {
    image: `/figures/${paperSlug}/fig-${figureId}.png`,
  };
};

const parsePdfPaper = (pdfPath) => {
  const rawText = execFileSync("pdftotext", [pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const meta = parsePdfMetadata(pdfPath);
  const inferredTitle = extractPdfTitleFromText(rawText);
  const paperSlug = slugify(
    meta.doi || meta.title || inferredTitle || path.basename(pdfPath, path.extname(pdfPath))
  );
  const pages = rawText.split("\f");
  const figureCaptionsByPage = pages.map((page) =>
    extractPdfFigureCaptionsFromPage(page)
  );
  const { imagesByPage, cleanup: cleanupEmbeddedImages } =
    extractPdfEmbeddedImages(pdfPath);
  const imageUseCountByPage = new Map();
  const rawSections = [];
  const figures = [];
  const seenFigureIds = new Set();
  let currentSection = null;
  let lastNarrativeSection = null;
  let lastHeadingTopLevel = 0;
  let inReferences = false;
  let reachedSupplementaryMaterials = false;

  const ensureSection = (title) => {
    const normalizedTitle = PDF_SECTION_TITLE_OVERRIDES.get(title) ?? title;
    const idBase = slugify(normalizedTitle) || `section-${rawSections.length + 1}`;
    const existingCount = rawSections.filter((section) =>
      section.id.startsWith(idBase)
    ).length;
    const id = existingCount === 0 ? idBase : `${idBase}-${existingCount + 1}`;
    currentSection = { id, title: normalizedTitle, paragraphs: [] };
    rawSections.push(currentSection);
    if (normalizedTitle !== "Figure Captions") {
      lastNarrativeSection = currentSection;
    }
  };

  const pushParagraph = (text) => {
    let paragraphText = stripPdfPageNumberArtifacts(
      text.replace(
        /\s+1\s+AI for Science, Microsoft Research\..*$/i,
        ""
      )
    );
    if (/^··/.test(paragraphText) && /Data Bank without special filtering/i.test(paragraphText)) {
      paragraphText = clean(
        paragraphText.replace(/^.*?(Data Bank without special filtering)/i, "$1")
      );
    }
    if (!paragraphText) return;
    if (PDF_TOC_LINE_PATTERN.test(paragraphText)) {
      return;
    }
    if (PDF_SKIP_PARAGRAPHS.some((pattern) => pattern.test(paragraphText))) {
      return;
    }
    if (
      /Scalable emulation of protein equilibrium ensembles with generative deep learning/i.test(
        paragraphText
      ) &&
      /Sarah Lewis/i.test(paragraphText)
    ) {
      return;
    }
    if (
      /AI for Science, Microsoft Research/i.test(paragraphText) ||
      /Freie Universität Berlin/i.test(paragraphText) ||
      /Department of Chemistry, Rice University/i.test(paragraphText)
    ) {
      return;
    }
    if (/Downloaded from https?:\/\/\S+/i.test(paragraphText)) {
      return;
    }
    if (!currentSection) {
      ensureSection("Introduction");
    }
    currentSection.paragraphs.push(paragraphText);
  };

  const pushFigureCaption = (text) => {
    const normalized = clean(text);
    if (!normalized) return;
    currentSection = lastNarrativeSection;
  };

  const addFigureFromCaption = (text, pageNumber) => {
    const normalized = clean(text);
    const figureId = extractFigureIdFromCaption(normalized);
    if (!figureId || seenFigureIds.has(figureId)) {
      return;
    }

    const pageImages = imagesByPage.get(pageNumber) ?? [];
    const pageImageUseCount = imageUseCountByPage.get(pageNumber) ?? 0;
    const embeddedImage = pageImages[pageImageUseCount] ?? null;
    imageUseCountByPage.set(pageNumber, pageImageUseCount + 1);
    const renderedFigure = embeddedImage
      ? renderPdfEmbeddedFigureImage(embeddedImage, paperSlug, figureId)
      : renderPdfFigurePage(pdfPath, paperSlug, pageNumber, figureId);

    figures.push({
      id: figureId,
      ...renderedFigure,
      caption: normalized,
    });
    seenFigureIds.add(figureId);
  };

  figureCaptionsByPage.forEach((captions, pageIndex) => {
    for (const caption of captions.values()) {
      addFigureFromCaption(caption, pageIndex + 1);
    }
  });

  const isCaptionContinuationBlock = (pageIndex, blockText) => {
    if (blockText.length < 24 || isPdfFigureCaption(blockText)) {
      return false;
    }
    return [...(figureCaptionsByPage[pageIndex]?.values() ?? [])].some((caption) =>
      caption.includes(blockText)
    );
  };

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const page = pages[pageIndex];
    const blocks = normalizePdfBlocks(page);

    for (const blockTextRaw of blocks) {
      let blockText = clean(blockTextRaw);
      if (!blockText) continue;
      if (reachedSupplementaryMaterials) {
        break;
      }
      if (
        !currentSection &&
        !/^Abstract$/i.test(blockText) &&
        !/^Abstract\s+/i.test(blockText) &&
        !/^Structural dynamics are fundamental to protein functions/i.test(blockText) &&
        !/^Keywords:/i.test(blockText) &&
        !PDF_NUMBERED_HEADING_PATTERN.test(blockText) &&
        !isPdfHeading(blockText) &&
        !isPdfFigureCaption(blockText)
      ) {
        continue;
      }
      if (/^Editor’s summary\b/i.test(blockText)) {
        reachedSupplementaryMaterials = true;
        break;
      }

      const keywordsIndex = blockText.search(/\bKeywords:/i);
      if (
        keywordsIndex !== -1 &&
        (currentSection?.title === "Data Availability Statement" ||
          /\bKeywords:.*\[\d+\]/i.test(blockText))
      ) {
        const beforeKeywords = clean(blockText.slice(0, keywordsIndex));
        if (beforeKeywords) {
          pushParagraph(beforeKeywords);
        }
        inReferences = true;
        continue;
      }

      const referencesIndex = blockText.search(/\b(?:REFERENCES AND NOTES|References)\b/i);
      if (referencesIndex !== -1) {
        const beforeReferences = clean(blockText.slice(0, referencesIndex));
        if (beforeReferences) {
          pushParagraph(beforeReferences);
        }
        inReferences = true;
        continue;
      }

      if (/^(?:REFERENCES AND NOTES|References)$/i.test(blockText)) {
        inReferences = true;
        continue;
      }

      if (/^Author affiliations:/i.test(blockText)) {
        inReferences = true;
        continue;
      }

      if (inReferences) {
        if (
          /^ACKNOWLEDGMENTS$/i.test(blockText) ||
          /^SUPPLEMENTARY MATERIALS$/i.test(blockText) ||
          /^Appendix:/i.test(blockText) ||
          isPdfFigureCaption(blockText)
        ) {
          inReferences = false;
        } else {
          continue;
        }
      }

      const summaryParts = blockText
        .split(/(?=(?:INTRODUCTION|RATIONALE|RESULTS|CONCLUSION):\s*)/)
        .map((part) => clean(part))
        .filter(Boolean);
      if (summaryParts.length > 1 || /^(INTRODUCTION|RATIONALE|RESULTS|CONCLUSION):/.test(blockText)) {
        for (const summaryPart of summaryParts) {
          const summaryMatch = summaryPart.match(
            /^(INTRODUCTION|RATIONALE|RESULTS|CONCLUSION):\s*(.+)$/
          );
          if (!summaryMatch) {
            continue;
          }
          ensureSection(summaryMatch[1].toUpperCase());
          pushParagraph(summaryMatch[2]);
        }
        continue;
      }

      if (isPdfFigureCaption(blockText)) {
        const figureId = extractFigureIdFromCaption(blockText);
        const caption = figureId ? figureCaptionsByPage[pageIndex]?.get(figureId) : null;
        if (!caption) {
          pushParagraph(blockText);
          continue;
        }
        addFigureFromCaption(caption, pageIndex + 1);
        pushFigureCaption(caption);
        continue;
      }

      if (isCaptionContinuationBlock(pageIndex, blockText)) {
        continue;
      }

      if (isLikelyPdfArtifact(blockText)) {
        continue;
      }

      if (!currentSection && /^Structural dynamics are fundamental to protein functions/i.test(blockText)) {
        ensureSection("Abstract");
        pushParagraph(blockText);
        continue;
      }

      if (
        currentSection?.title === "Significance" &&
        /^Protein deep learning models have made significant/i.test(blockText)
      ) {
        ensureSection("Introduction");
        pushParagraph(blockText);
        continue;
      }

      const numberedHeadingMatch = blockText.match(PDF_NUMBERED_HEADING_PATTERN);
      if (numberedHeadingMatch && isPdfHeadingTitle(numberedHeadingMatch[2])) {
        const headingNumber = numberedHeadingMatch[1].replace(/\.$/, "");
        const headingTitle = numberedHeadingMatch[2];
        if (
          /^(?:DISCO|Applications|S-S bonds)$/i.test(headingTitle) ||
          /Applications/i.test(headingTitle)
        ) {
          continue;
        }
        const topLevel = Number.parseInt(headingNumber.split(".")[0], 10);
        if (!Number.isNaN(topLevel) && topLevel >= lastHeadingTopLevel) {
          lastHeadingTopLevel = topLevel;
          ensureSection(`${headingNumber} ${headingTitle}`);
          continue;
        }
      }

      if (isPdfHeading(blockText)) {
        if (/^RESEARCH ARTICLE SUMMARY$/i.test(blockText)) {
          continue;
        }
        ensureSection(blockText);
        if (/^SUPPLEMENTARY MATERIALS$/i.test(blockText)) {
          reachedSupplementaryMaterials = true;
        }
        continue;
      }

      if (isPdfHeadingTitle(blockText) && /[.]$/.test(blockText)) {
        ensureSection(blockText.replace(/\.$/, ""));
        continue;
      }

      if (/^Corresponding author\./i.test(blockText)) {
        ensureSection("Article Notes");
        pushParagraph(blockText);
        continue;
      }

      if (/^science\.org\/doi\/10\./i.test(blockText)) {
        if (!currentSection) {
          ensureSection("Article Notes");
        }
        pushParagraph(blockText);
        continue;
      }

      if (pageIndex === 0 && /^Illustration of the BioEmu model and workflow\./i.test(blockText)) {
        ensureSection("Cover Figure Caption");
        pushParagraph(blockText);
        continue;
      }

      if (/^Submitted \d{1,2} /i.test(blockText)) {
        ensureSection("Publication History");
        pushParagraph(blockText);
        reachedSupplementaryMaterials = true;
        continue;
      }

      pushParagraph(blockText);
    }
  }

  cleanupEmbeddedImages();

  return {
    title:
      meta.title || inferredTitle || path.basename(pdfPath, path.extname(pdfPath)),
    doi: meta.doi || "",
    sourceUrl:
      PAPER_SOURCE_URL ||
      (meta.arxivId
        ? `https://arxiv.org/abs/${meta.arxivId.replace(/v\d+$/i, "")}`
        : `file://${pdfPath}`),
    figures,
    rawSections,
  };
};

let figures = [];
let rawSections = [];
let articleTitle = "";
let doi = "";
let sourceUrl = ARTICLE_URL;

if (PAPER_PDF) {
  const pdfPaper = parsePdfPaper(PAPER_PDF);
  figures = pdfPaper.figures;
  rawSections = pdfPaper.rawSections;
  articleTitle = pdfPaper.title;
  doi = pdfPaper.doi;
  sourceUrl = pdfPaper.sourceUrl;
} else {
  const response = await fetch(ARTICLE_URL, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${ARTICLE_URL}: ${response.status}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);

  $("figure").each((_, node) => {
    const fig = $(node);
    const caption = clean(fig.find("figcaption").text());
    const imageRaw = fig.find("img").first().attr("src") ?? "";
    const image = imageRaw.startsWith("//") ? `https:${imageRaw}` : imageRaw;
    const id = extractFigureIdFromCaption(caption);
    if (!id || !image) return;
    figures.push({
      id,
      image,
      caption,
    });
  });

  for (const sectionId of INCLUDED_SECTION_IDS) {
    const section = $(`#${sectionId}`);
    if (!section.length) continue;

    const title = clean(section.find("h2").first().text()) || sectionId;
    const paragraphs = [];

    section.find("> .c-article-section__content p").each((_, pNode) => {
      const paragraphText = paragraphTextWithScripts($, pNode);
      if (!paragraphText) return;
      paragraphs.push(paragraphText);
    });

    rawSections.push({
      id: sectionId,
      title,
      paragraphs,
    });
  }

  articleTitle = clean($("h1.c-article-title").first().text());
  doi = clean(
    $('meta[name="citation_doi"]').attr("content") ??
      $('meta[name="DOI"]').attr("content") ??
      $('meta[name="dc.identifier"]').attr("content") ??
      $('a[href*="doi.org"], [data-test="doi"]').first().text()
  )
    .replace(/^doi:/i, "")
    .replace("https://doi.org/", "")
    .replace("doi.org/", "")
    .trim();
}

const { sections, runningSentenceNumber } = buildSectionEntries(rawSections);

const data = {
  meta: {
    title: articleTitle || "",
    doi: doi || "",
    sourceUrl,
    generatedAt: new Date().toISOString(),
    sentenceCount: runningSentenceNumber,
  },
  figures,
  sections,
};

if (manualTranslations.size > 0 && missingManualIds.length > 0) {
  throw new Error(
    `Missing manual translations for ${missingManualIds.length} sentence IDs: ${missingManualIds.slice(0, 15).join(", ")}${missingManualIds.length > 15 ? "..." : ""}`
  );
}

if (manualTranslations.size > 0) {
  const unusedManualIds = [...manualTranslations.keys()].filter(
    (id) => !usedManualIds.has(id)
  );
  if (unusedManualIds.length > 0) {
    throw new Error(
      `Found ${unusedManualIds.length} unused manual translation IDs: ${unusedManualIds.slice(0, 15).join(", ")}${unusedManualIds.length > 15 ? "..." : ""}`
    );
  }
}

fs.mkdirSync(path.dirname(outputJson), { recursive: true });
fs.writeFileSync(outputJson, `${JSON.stringify(data, null, 2)}\n`, "utf8");

process.stdout.write(
  `Wrote ${sections.length} sections, ${runningSentenceNumber} sentences, ${figures.length} figures to ${outputJson}\n`
);
