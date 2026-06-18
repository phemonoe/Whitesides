export type SentenceEntry = {
  id: string;
  source: string;
  plain: string;
  figureRefs: number[];
};

export type ParagraphEntry = {
  id: string;
  source: string;
  sentences: SentenceEntry[];
};

export type SectionEntry = {
  id: string;
  title: string;
  paragraphs: ParagraphEntry[];
};

export type FigureEntry = {
  id: number;
  image: string;
  width?: number;
  height?: number;
  caption: string;
};

export type PaperData = {
  meta: {
    title: string;
    doi: string;
    sourceUrl: string;
    generatedAt: string;
    sentenceCount: number;
  };
  figures: FigureEntry[];
  sections: SectionEntry[];
};
