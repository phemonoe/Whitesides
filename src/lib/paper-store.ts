import fs from "node:fs";
import path from "node:path";
import type { PaperData } from "@/types/paper";

const root = process.cwd();
const currentPaperPath = path.join(root, "src", "data", "paper-data.json");
const savedRoot = path.join(root, "saved-papers");

export type LibraryPaper = {
  slug: string;
  title: string;
  doi: string;
  sentenceCount: number;
  sourceUrl: string;
  savedAt: string;
  isCurrent: boolean;
};

const readJson = <T>(filePath: string): T => {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
};

const readPaperMetaFromData = (filePath: string) => {
  const paper = readJson<PaperData>(filePath);
  return {
    title: paper.meta.title,
    doi: paper.meta.doi,
    sentenceCount: paper.meta.sentenceCount,
    sourceUrl: paper.meta.sourceUrl,
    savedAt: paper.meta.generatedAt,
  };
};

const toLibraryPaper = (
  slug: string,
  isCurrent: boolean,
  meta: {
    title?: string;
    doi?: string;
    sentenceCount?: number;
    sourceUrl?: string;
    savedAt?: string;
  }
): LibraryPaper => ({
  slug,
  isCurrent,
  title: meta.title?.trim() || "Untitled Paper",
  doi: meta.doi?.trim() || "Unknown DOI",
  sentenceCount: Number(meta.sentenceCount ?? 0),
  sourceUrl: meta.sourceUrl?.trim() || "",
  savedAt: meta.savedAt || new Date(0).toISOString(),
});

export const listLibraryPapers = (): LibraryPaper[] => {
  const papers: LibraryPaper[] = [];

  if (fs.existsSync(currentPaperPath)) {
    const currentMeta = readPaperMetaFromData(currentPaperPath);
    papers.push(toLibraryPaper("current", true, currentMeta));
  }

  if (!fs.existsSync(savedRoot)) {
    return papers;
  }

  const entries = fs
    .readdirSync(savedRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const slug of entries) {
    const dir = path.join(savedRoot, slug);
    const metaPath = path.join(dir, "meta.json");
    const paperPath = path.join(dir, "paper-data.json");

    let paper: LibraryPaper | null = null;

    if (fs.existsSync(metaPath)) {
      try {
        const meta = readJson<{
          title?: string;
          doi?: string;
          sentenceCount?: number;
          sourceUrl?: string;
          savedAt?: string;
        }>(metaPath);
        paper = toLibraryPaper(slug, false, meta);
      } catch {
        paper = null;
      }
    }

    if (!paper && fs.existsSync(paperPath)) {
      try {
        paper = toLibraryPaper(slug, false, readPaperMetaFromData(paperPath));
      } catch {
        paper = null;
      }
    }

    if (paper) {
      papers.push(paper);
    }
  }

  return papers.sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) {
      return a.isCurrent ? -1 : 1;
    }
    return Date.parse(b.savedAt) - Date.parse(a.savedAt);
  });
};

export const loadPaperBySlug = (slug: string): PaperData | null => {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    return null;
  }

  if (normalizedSlug === "current") {
    if (!fs.existsSync(currentPaperPath)) {
      return null;
    }
    return readJson<PaperData>(currentPaperPath);
  }

  const filePath = path.join(savedRoot, normalizedSlug, "paper-data.json");
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return readJson<PaperData>(filePath);
};
