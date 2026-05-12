import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const savedRoot = path.join(root, "saved-papers");

if (!fs.existsSync(savedRoot)) {
  process.stdout.write("No saved papers yet.\n");
  process.exit(0);
}

const dirs = fs
  .readdirSync(savedRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (!dirs.length) {
  process.stdout.write("No saved papers yet.\n");
  process.exit(0);
}

for (const slug of dirs) {
  const metaPath = path.join(savedRoot, slug, "meta.json");
  if (!fs.existsSync(metaPath)) {
    process.stdout.write(`${slug}\n`);
    continue;
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  const title = meta.title || "(untitled)";
  const doi = meta.doi || "(no DOI)";
  process.stdout.write(
    `${slug}\t${title}\t${doi}\t${meta.sentenceCount ?? 0} sentences\n`
  );
}
