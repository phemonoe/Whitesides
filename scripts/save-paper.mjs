import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const activePaperPath = path.join(root, "src", "data", "paper-data.json");
const activeTranslationsPath = path.join(
  root,
  "src",
  "data",
  "manual-translations.tsv"
);
const activeParagraphPassesPath = path.join(
  root,
  "src",
  "data",
  "paragraph-passes.json"
);
const savedRoot = path.join(root, "saved-papers");

if (!fs.existsSync(activePaperPath)) {
  throw new Error(`Missing active paper file: ${activePaperPath}`);
}

const activePaper = JSON.parse(fs.readFileSync(activePaperPath, "utf8"));

const normalizeSlug = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const requestedSlug = normalizeSlug(process.argv[2]);
const autoSlug =
  normalizeSlug(activePaper?.meta?.doi) ||
  normalizeSlug(activePaper?.meta?.title) ||
  `paper-${Date.now()}`;
const slug = requestedSlug || autoSlug;

const outDir = path.join(savedRoot, slug);
fs.mkdirSync(outDir, { recursive: true });

fs.copyFileSync(activePaperPath, path.join(outDir, "paper-data.json"));

if (fs.existsSync(activeTranslationsPath)) {
  fs.copyFileSync(
    activeTranslationsPath,
    path.join(outDir, "manual-translations.tsv")
  );
}

if (fs.existsSync(activeParagraphPassesPath)) {
  fs.copyFileSync(
    activeParagraphPassesPath,
    path.join(outDir, "paragraph-passes.json")
  );
}

const meta = {
  slug,
  savedAt: new Date().toISOString(),
  title: activePaper?.meta?.title ?? "",
  doi: activePaper?.meta?.doi ?? "",
  sourceUrl: activePaper?.meta?.sourceUrl ?? "",
  sentenceCount: Number(activePaper?.meta?.sentenceCount ?? 0),
  paragraphCount: Array.isArray(activePaper?.sections)
    ? activePaper.sections.reduce(
        (sum, section) => sum + Number(section?.paragraphs?.length ?? 0),
        0
      )
    : 0,
};

fs.writeFileSync(
  path.join(outDir, "meta.json"),
  `${JSON.stringify(meta, null, 2)}\n`,
  "utf8"
);

process.stdout.write(`Saved paper snapshot: ${slug}\n`);
