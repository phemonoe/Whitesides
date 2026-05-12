import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const slug = String(process.argv[2] ?? "").trim();

if (!slug) {
  throw new Error("Usage: bun scripts/load-paper.mjs <saved-paper-slug>");
}

const fromDir = path.join(root, "saved-papers", slug);
const fromPaperPath = path.join(fromDir, "paper-data.json");
const fromTranslationsPath = path.join(fromDir, "manual-translations.tsv");
const fromParagraphPassesPath = path.join(fromDir, "paragraph-passes.json");

if (!fs.existsSync(fromPaperPath)) {
  throw new Error(`Saved paper not found: ${fromDir}`);
}

const toDataDir = path.join(root, "src", "data");
const toPaperPath = path.join(toDataDir, "paper-data.json");
const toTranslationsPath = path.join(toDataDir, "manual-translations.tsv");
const toParagraphPassesPath = path.join(toDataDir, "paragraph-passes.json");

fs.mkdirSync(toDataDir, { recursive: true });
fs.copyFileSync(fromPaperPath, toPaperPath);

if (fs.existsSync(fromTranslationsPath)) {
  fs.copyFileSync(fromTranslationsPath, toTranslationsPath);
}

if (fs.existsSync(fromParagraphPassesPath)) {
  fs.copyFileSync(fromParagraphPassesPath, toParagraphPassesPath);
}

process.stdout.write(`Loaded paper snapshot: ${slug}\n`);
