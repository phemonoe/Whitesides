import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const paperDataPath = path.join(root, "src", "data", "paper-data.json");
const outPath = path.join(root, "src", "data", "manual-translations.tsv");
const paragraphPassesPath = path.join(
  root,
  "src",
  "data",
  "paragraph-passes.json"
);

const data = JSON.parse(fs.readFileSync(paperDataPath, "utf8"));

const conceptNotes = [
  {
    key: "JEPA",
    pattern: /\bJEPA\b/,
    note: "JEPA means Joint-Embedding Predictive Architecture, a model that predicts useful internal representations instead of raw output details.",
  },
  {
    key: "H-JEPA",
    pattern: /\bH-JEPA\b/,
    note: "H-JEPA means Hierarchical JEPA, a stacked multi-level version of JEPA for reasoning at different levels of abstraction.",
  },
  {
    key: "EBM",
    pattern: /\bEBM\b/,
    note: "EBM means Energy-Based Model, a model that gives low scores to compatible states and higher scores to incompatible ones.",
  },
  {
    key: "SSL",
    pattern: /\bSSL\b|\bself-supervised learning\b/i,
    note: "Self-supervised learning means learning from the structure inside raw data rather than from human-provided labels.",
  },
  {
    key: "MPC",
    pattern: /\bMPC\b|\bmodel-predictive control\b/i,
    note: "Model-predictive control is a planning method that simulates future outcomes before acting.",
  },
  {
    key: "VICReg",
    pattern: /\bVICReg\b/,
    note: "VICReg is a self-supervised training method that keeps representations informative without relying on explicit negative examples.",
  },
  {
    key: "VAE",
    pattern: /\bVAE\b/,
    note: "VAE means Variational Autoencoder, a model that uses probabilistic hidden variables to represent uncertainty.",
  },
  {
    key: "MCTS",
    pattern: /\bMCTS\b|\bMonte-Carlo Tree Search\b/i,
    note: "Monte-Carlo Tree Search is a search method that explores promising decision branches instead of checking everything exhaustively.",
  },
  {
    key: "Gibbs",
    pattern: /\bGibbs\b|\bGibbs-Boltzmann\b/i,
    note: "A Gibbs or Gibbs-Boltzmann distribution turns energies into probabilities, so lower-energy states become more likely.",
  },
  {
    key: "Latent",
    pattern: /\blatent variable\b/i,
    note: "A latent variable is a hidden variable the model uses to represent missing, uncertain, or compressed information.",
  },
  {
    key: "Amortized",
    pattern: /\bamortized inference\b/i,
    note: "Amortized inference means training a shortcut network to guess a good hidden-variable setting instead of solving the full optimization from scratch every time.",
  },
  {
    key: "Transformer",
    pattern: /\btransformer\b/i,
    note: "A transformer is a neural-network architecture that uses attention to model relationships between many items at once.",
  },
  {
    key: "FactorGraph",
    pattern: /\bfactor graph\b/i,
    note: "A factor graph is a graphical way to show variables and the constraints or scoring terms that connect them.",
  },
  {
    key: "PolicyGradient",
    pattern: /\bpolicy gradient\b/i,
    note: "Policy-gradient methods improve an action policy by nudging it toward actions that led to better outcomes.",
  },
  {
    key: "WorldModel",
    pattern: /\bworld model\b/i,
    note: "A world model is an internal predictive model of how the world changes over time.",
  },
  {
    key: "Differentiable",
    pattern: /\bdifferentiable\b/i,
    note: "Differentiable here means the system is smooth enough for gradient-based learning signals to flow through it.",
  },
  {
    key: "Configurator",
    pattern: /\bconfigurator\b/i,
    note: "The configurator is the control module that sets up the other modules for the current task.",
  },
  {
    key: "Critic",
    pattern: /\bcritic\b/i,
    note: "The critic is the part of the system that estimates future cost or future badness/goodness.",
  },
  {
    key: "IntrinsicCost",
    pattern: /\bintrinsic cost\b/i,
    note: "Intrinsic cost means the built-in internal scoring function that represents the agent’s basic drives or discomforts.",
  },
  {
    key: "PDB",
    pattern: /\bPDB\b/,
    note: "PDB is the Protein Data Bank, the main public structure database.",
  },
  {
    key: "SMILES",
    pattern: /\bSMILES\b/,
    note: "SMILES is a text format for writing chemical structures.",
  },
  {
    key: "MSA",
    pattern: /\bMSA\b/,
    note: "MSA means multiple-sequence alignment, a stack of related sequences.",
  },
  {
    key: "LDDT",
    pattern: /\bLDDT\b/,
    note: "LDDT is a 0–100 score for local structural accuracy.",
  },
  {
    key: "GDT",
    pattern: /\bGDT\b/,
    note: "GDT is a 0–100 score for global structural similarity.",
  },
  {
    key: "DockQ",
    pattern: /\bDockQ\b/,
    note: "DockQ is a score for interface prediction quality.",
  },
  {
    key: "ipTM",
    pattern: /\bipTM\b/,
    note: "ipTM is a confidence score for interactions between chains.",
  },
  {
    key: "pLDDT",
    pattern: /\bpLDDT\b/,
    note: "pLDDT is the model’s per-atom confidence estimate.",
  },
  {
    key: "PAE",
    pattern: /\bPAE\b/,
    note: "PAE estimates uncertainty in relative positions between regions.",
  },
  {
    key: "PDE",
    pattern: /\bPDE\b/,
    note: "PDE predicts pairwise distance errors between atoms.",
  },
  {
    key: "rmsd",
    pattern: /\br\.m\.s\.d\./i,
    note: "r.m.s.d. is average geometric error in angstroms.",
  },
  {
    key: "Neff",
    pattern: /\bNeff\b/,
    note: "Neff is an effective count of diverse sequences in an alignment.",
  },
  {
    key: "pLM",
    pattern: /\bpLMs?\b|\bprotein language models?\b/i,
    note: "A protein language model is an AI model that reads amino-acid sequences in a way similar to how language models read words.",
  },
  {
    key: "SeqDance",
    pattern: /\bSeqDance\b/,
    note: "SeqDance is the paper's model trained directly from protein sequences to predict dynamic biophysical properties.",
  },
  {
    key: "ESMDance",
    pattern: /\bESMDance\b/,
    note: "ESMDance is the paper's model that starts from ESM2 representations and adds training on protein dynamics.",
  },
  {
    key: "MD",
    pattern: /\bMD\b|\bmolecular dynamics\b/i,
    note: "Molecular dynamics means simulating how atoms or coarse-grained protein parts move over time according to physical forces.",
  },
  {
    key: "NMA",
    pattern: /\bNMA\b|\bnormal mode analysis\b/i,
    note: "Normal mode analysis estimates the natural vibration patterns of a protein around a stable shape.",
  },
  {
    key: "IDR",
    pattern: /\bIDRs?\b|\bintrinsically disordered regions?\b/i,
    note: "Intrinsically disordered regions are protein regions that do not settle into one fixed 3D shape.",
  },
  {
    key: "SASA",
    pattern: /\bSASA\b|\bsolvent-accessible surface area\b/i,
    note: "SASA measures how much of a residue or protein surface is exposed to surrounding solvent.",
  },
  {
    key: "RMSF",
    pattern: /\bRMSF\b|\bRMS fluctuation\b/i,
    note: "RMSF measures how much each residue tends to move or fluctuate in a structural ensemble.",
  },
  {
    key: "DeltaDeltaG",
    pattern: /ΔΔG|\bddG\b/i,
    note: "ΔΔG measures how much a mutation changes protein stability; larger destabilizing values usually mean worse folding stability.",
  },
  {
    key: "ZeroShot",
    pattern: /\bzero-shot\b/i,
    note: "Zero-shot means applying a model to a task without training it specifically on examples for that task.",
  },
  {
    key: "Spearman",
    pattern: /\bSpearman\b/i,
    note: "Spearman correlation measures whether two quantities tend to rise and fall together by rank, not by exact numerical scale.",
  },
  {
    key: "Embedding",
    pattern: /\bembeddings?\b/i,
    note: "An embedding is a learned numerical representation that stores useful information about a sequence or residue.",
  },
  {
    key: "Attention",
    pattern: /\battention heads?\b|\bself-attention\b/i,
    note: "Attention lets a model decide which other residues are most relevant when interpreting a given residue.",
  },
  {
    key: "Homolog",
    pattern: /\bhomologs?\b/i,
    note: "A homolog is a related protein sequence that likely shares evolutionary ancestry.",
  },
  {
    key: "CoarseGrained",
    pattern: /\bcoarse-grained\b/i,
    note: "Coarse-grained models simplify a molecule by grouping atoms into larger units so simulations are cheaper.",
  },
  {
    key: "GNM",
    pattern: /\bGNM\b|\bGaussian Network Model\b/i,
    note: "The Gaussian Network Model is a simplified normal-mode method for estimating protein motions.",
  },
  {
    key: "ANM",
    pattern: /\bANM\b|\bAnisotropic Network Model\b/i,
    note: "The Anisotropic Network Model is a simplified normal-mode method that estimates direction-specific protein motions.",
  },
  {
    key: "DISCO",
    pattern: /\bD\s?ISCO\b|\bDIffusion for Sequence-structure CO-design\b/i,
    note: "DISCO is the paper's model for designing a protein's amino-acid sequence and 3D shape together.",
  },
  {
    key: "Multimodal",
    pattern: /\bmultimodal\b/i,
    note: "Multimodal means the model handles more than one kind of information at the same time, such as sequence, structure, and small molecules.",
  },
  {
    key: "DiffusionModel",
    pattern: /\bdiffusion\b/i,
    note: "A diffusion model learns to create data by starting from noise and gradually removing that noise.",
  },
  {
    key: "FeynmanKac",
    pattern: /\bFeynman-Kac\b|\bFKC\b/,
    note: "A Feynman-Kac corrector is a sampling trick that steers generated designs toward desired properties while generation is still happening.",
  },
  {
    key: "Codesignability",
    pattern: /\bco-designable\b|\bco-designability\b/i,
    note: "Co-designability means the generated sequence and structure still match after an independent folding model checks them.",
  },
  {
    key: "DeNovo",
    pattern: /\bde novo\b/i,
    note: "De novo means designed from scratch rather than copied from an existing natural protein.",
  },
  {
    key: "Theozyme",
    pattern: /\btheozymes?\b/i,
    note: "A theozyme is an idealized arrangement of catalytic atoms that computational enzyme design often tries to scaffold.",
  },
  {
    key: "Carbene",
    pattern: /\bcarbene\b/i,
    note: "A carbene is a highly reactive carbon-containing species that can be transferred into new chemical bonds.",
  },
  {
    key: "Heme",
    pattern: /\bheme\b|\bhemin\b/i,
    note: "Heme is an iron-containing chemical cofactor that many proteins use to carry out redox or catalytic chemistry.",
  },
  {
    key: "DirectedEvolution",
    pattern: /\bdirected evolution\b/i,
    note: "Directed evolution means repeatedly mutating and screening proteins to find variants with better activity.",
  },
  {
    key: "TTN",
    pattern: /\bTTN\b|\btotal turnover number\b/i,
    note: "TTN, total turnover number, counts how many product molecules one catalyst molecule makes before stopping.",
  },
  {
    key: "Enantioselectivity",
    pattern: /\benantioselectiv|\benantiomeric excess\b|\bee\b/,
    note: "Enantioselectivity means preferring one mirror-image form of a molecule over the other.",
  },
  {
    key: "Diastereomeric",
    pattern: /\bdiastereomeric\b|\bdiastereoselect/i,
    note: "Diastereomeric selectivity means preferring one non-mirror-image stereochemical product over another.",
  },
  {
    key: "InverseFolding",
    pattern: /\binverse folding\b/i,
    note: "Inverse folding means designing an amino-acid sequence to fit a fixed target protein backbone.",
  },
  {
    key: "RMSD",
    pattern: /\bRMSD\b/i,
    note: "RMSD measures average 3D distance between matched atoms; smaller values mean two structures are more similar.",
  },
  {
    key: "DFT",
    pattern: /\bDFT\b|\bdensity functional theory\b/i,
    note: "Density functional theory is a quantum-chemistry method for estimating molecular energies and geometries.",
  },
];

const seenConcepts = new Set();

const INLINE_SUPERSCRIPT_MAP = new Map([
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
  ["-", "⁻"],
  ["−", "⁻"],
  ["+", "⁺"],
  [".", "."],
  [",", "⸴"],
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
]);

const replacements = [
  [/\bpercepts\b/gi, "sensory inputs"],
  [/\bpercept\b/gi, "sensory input"],
  [/\bintrinsic motivation\b/gi, "internal motivation"],
  [/\bhierarchical\b/gi, "multi-level"],
  [/\blatent variables\b/gi, "hidden variables"],
  [/\blatent variable\b/gi, "hidden variable"],
  [/\bAlphaFold 21\b/g, "AlphaFold 2"],
  [/\bprotein–nucleic acid\b/g, "protein-nucleic-acid"],
  [/\bD ISCO\b/g, "DISCO"],
  [/\bD ISCO’s\b/g, "DISCO’s"],
  [/\bS TUDIO\b/g, "STUDIO"],
  [/\bcapable of predicting\b/gi, "able to predict"],
  [/\bsubstantially\b/gi, "much"],
  [/\bdemonstrates?\b/gi, "shows"],
  [/\bdemonstrating\b/gi, "showing"],
  [/\bframework\b/gi, "method"],
  [/\bmodelling\b/gi, "modeling"],
  [/\bbiomolecular\b/gi, "biomolecular"],
  [/\btherapeutics\b/gi, "therapeutic drugs"],
  [/\benormous\b/gi, "major"],
  [/\btremendously\b/gi, "greatly"],
  [/\bwide range of\b/gi, "broad set of"],
  [/\bhigh-accuracy\b/gi, "high-precision"],
  [/\bstate-of-the-art\b/gi, "best currently available"],
  [/\bdiffusion-based\b/gi, "diffusion-model-based"],
  [/\bcomplexes\b/gi, "complexes"],
  [/\bgeneralist\b/gi, "general-purpose"],
  [/\bspecialized\b/gi, "task-specific"],
  [/\bwhereby\b/gi, "where"],
  [/\btherefore\b/gi, "so"],
  [/\bhowever\b/gi, "but"],
  [/\bmoreover\b/gi, "also"],
  [/\bFurthermore\b/g, "Also"],
  [/\bfig\.\s*/gi, "Figure "],
  [/\bFigs\.\s*/gi, "Figures "],
  [/\bprotein–ligand\b/g, "protein-ligand"],
  [/\bprotein–protein\b/g, "protein-protein"],
  [/\bprotein–nucleic\b/g, "protein-nucleic-acid"],
  [/\bantibody–antigen\b/g, "antibody-antigen"],
  [/\bside-chain\b/gi, "side-chain"],
  [/\bglobal constellation\b/gi, "overall arrangement"],
  [/\bhallucination\b/gi, "spurious invented structure"],
  [/\bhomology\b/gi, "evolutionary similarity"],
  [/\bstereochemical\b/gi, "3D-chemistry"],
];

const convertCaretSuperscripts = (value) =>
  value.replace(/\^([0-9+\-−.,]+)/g, (_, raw) => {
    let out = "";
    for (const char of raw) {
      const mapped = INLINE_SUPERSCRIPT_MAP.get(char);
      if (!mapped) {
        return `^${raw}`;
      }
      out += mapped;
    }
    return out;
  });

const humanize = (source) => {
  const sourceNormalized = source.replace(/\s+/g, " ").trim();
  let out = convertCaretSuperscripts(sourceNormalized);

  for (const [pattern, value] of replacements) {
    out = out.replace(pattern, value);
  }

  out = out
    .replace(/\s+\(/g, " (")
    .replace(/ {2,}/g, " ")
    .replace(/ ,/g, ",")
    .replace(/ \./g, ".")
    .replace(/\s+;/g, ";")
    .trim();

  out = convertCaretSuperscripts(out);

  for (const concept of conceptNotes) {
    if (!seenConcepts.has(concept.key) && concept.pattern.test(source)) {
      out = `${out} (${concept.note})`;
      seenConcepts.add(concept.key);
      break;
    }
  }

  if (/^[a-z]/.test(out)) {
    out = out[0].toUpperCase() + out.slice(1);
  }

  return out;
};

const lines = [];
const paragraphPasses = [];
for (const section of data.sections) {
  for (const paragraph of section.paragraphs) {
    const sentenceDrafts = [];
    for (const sentence of paragraph.sentences) {
      const plain = humanize(sentence.source);
      lines.push(`${sentence.id}\t${plain}`);
      sentenceDrafts.push({
        id: sentence.id,
        source: sentence.source,
        plain,
      });
    }

    paragraphPasses.push({
      id: paragraph.id,
      sectionId: section.id,
      sectionTitle: section.title,
      source: paragraph.source,
      sentences: sentenceDrafts,
    });
  }
}

fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
fs.writeFileSync(
  paragraphPassesPath,
  `${JSON.stringify(
    {
      meta: {
        title: data.meta.title,
        doi: data.meta.doi,
        sourceUrl: data.meta.sourceUrl,
        generatedAt: new Date().toISOString(),
        sentenceCount: lines.length,
        paragraphCount: paragraphPasses.length,
      },
      paragraphs: paragraphPasses,
    },
    null,
    2
  )}\n`,
  "utf8"
);

process.stdout.write(
  `Wrote ${lines.length} translations to ${outPath} and ${paragraphPasses.length} paragraph passes to ${paragraphPassesPath}\n`
);
