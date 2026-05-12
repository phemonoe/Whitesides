## Paper Hover Reader (Next.js + Bun)

Interactive, sentence-first paper reader for:
- Full paper ingestion from Nature article HTML
- Complete sentence-by-sentence plain-language rewrite
- Hover/focus figure previews when text references `Fig. n`
- Library-style home page for browsing saved translations

### 1) Build paper data

```bash
bun run build:paper-data
```

By default this fetches:

`https://www.nature.com/articles/s41586-021-03819-2`

To use a different source URL:

```bash
PAPER_URL="https://www.nature.com/articles/<article-id>" bun run build:paper-data
```

Generated outputs:
- `src/data/paper-data.json`
- Flat sentence translation ledger: `src/data/manual-translations.tsv`
- Paragraph-pass translation source: `src/data/paragraph-passes.json`

### 2) Start the app

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3) Navigation model
- `/` is a translation library view
- `/paper/current` opens the current working translation in `src/data/paper-data.json`
- `/paper/<slug>` opens any saved translation snapshot from `saved-papers/<slug>/paper-data.json`

### 4) Reader interaction model
- Read continuous translated paragraphs (not sentence cards)
- Hover any translated sentence that references a figure (for example `Fig. 2`)
- Right panel updates with figure image/caption plus active sentence detail
- Toggle source paragraphs on/off for side-by-side verification

### Scripts
- `bun run build:paper-data`: re-ingest source article + rebuild sentence-level data
- `bun run translations:generate`: generate draft translations plus paragraph-pass chunks
- `bun run translations:compile`: compile `paragraph-passes.json` back into `manual-translations.tsv`
- `bun run dev`: run local development server
- `bun run build`: production build
- `bun run lint`: lint checks
- `bun run paper:save [slug]`: save current translated paper snapshot to `saved-papers/<slug>/`
- `bun run paper:list`: list saved paper snapshots
- `bun run paper:load <slug>`: load a saved snapshot into `src/data/` (instant switch, no retranslation)

### Paragraph-pass workflow
- Draft or revise translations in `src/data/paragraph-passes.json`
- Each paragraph chunk keeps section title, paragraph source, and all sentence IDs together
- Rebuild directly with `bun run build:paper-data` because the builder now prefers `paragraph-passes.json` when it exists
- If you want the legacy flat TSV synced too, run `bun run translations:compile`
