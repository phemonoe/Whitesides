import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const paragraphPassesPath = path.join(root, "src", "data", "paragraph-passes.json");
const outPath = path.join(root, "src", "data", "manual-translations.tsv");

if (!fs.existsSync(paragraphPassesPath)) {
  throw new Error(`Missing paragraph passes file: ${paragraphPassesPath}`);
}

const raw = fs.readFileSync(paragraphPassesPath, "utf8");
const parsed = JSON.parse(raw);
const paragraphs = Array.isArray(parsed?.paragraphs) ? parsed.paragraphs : null;

if (!paragraphs) {
  throw new Error(
    `Invalid paragraph passes file at ${paragraphPassesPath}: missing paragraphs array`
  );
}

const lines = [];
const seenIds = new Set();

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

    if (seenIds.has(id)) {
      throw new Error(`Duplicate translation id ${id} in ${paragraphPassesPath}`);
    }

    seenIds.add(id);
    lines.push(`${id}\t${plain}`);
  }
}

fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
process.stdout.write(
  `Compiled ${lines.length} sentence translations from ${paragraphPassesPath} to ${outPath}\n`
);
