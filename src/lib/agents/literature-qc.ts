import { searchLiterature } from "../semantic-scholar";
import { searchScientificEvidence } from "../tavily";
import {
  getNoveltyExactMatchThreshold,
  type LiteratureQcReference,
  type LiteratureQcSummary,
  type NoveltySignal,
  type QuestionProfile,
} from "../workflow-types";

function countOverlap(terms: string[], text: string): number {
  const lower = text.toLowerCase();
  return terms.filter((t) => lower.includes(t.toLowerCase())).length;
}

function classifyNovelty(
  semanticPapers: unknown[],
  tavilyResults: LiteratureQcReference[],
  keyTerms: string[],
): NoveltySignal {
  if (semanticPapers.length === 0 && tavilyResults.length === 0) return "not_found";

  const allTitles = [
    ...semanticPapers.map((p) => {
      const paper = p as { title?: string };
      return paper.title ?? "";
    }),
    ...tavilyResults.map((r) => r.title),
  ];

  const maxOverlap = Math.max(...allTitles.map((t) => countOverlap(keyTerms, t)));
  if (maxOverlap >= getNoveltyExactMatchThreshold(keyTerms.length)) return "exact_match";
  return "similar_exists";
}

export async function runLiteratureQc(profile: QuestionProfile): Promise<LiteratureQcSummary> {
  const searchQuery = profile.keyTerms.slice(0, 5).join(" ");

  const [semanticResult, tavilyResult] = await Promise.allSettled([
    searchLiterature(searchQuery),
    searchScientificEvidence(searchQuery),
  ]);

  const papers = semanticResult.status === "fulfilled" ? semanticResult.value.papers : [];
  const tavilyRefs: LiteratureQcReference[] =
    tavilyResult.status === "fulfilled"
      ? tavilyResult.value.results.map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet,
          relevanceScore: r.relevanceScore,
        }))
      : [];

  const noveltySignal = classifyNovelty(papers, tavilyRefs, profile.keyTerms);

  const semanticRefs: LiteratureQcReference[] = papers.slice(0, 3).map((p) => {
    const paper = p as {
      title?: string;
      year?: number;
      externalIds?: { DOI?: string };
      openAccessPdf?: { url?: string };
    };
    const doi = paper.externalIds?.DOI;
    const url = paper.openAccessPdf?.url ?? (doi ? `https://doi.org/${doi}` : "https://www.semanticscholar.org");
    return {
      title: paper.title ?? "Untitled",
      url,
      snippet: `Year: ${paper.year ?? "unknown"}`,
      relevanceScore: null,
    };
  });

  const allRefs = [...semanticRefs, ...tavilyRefs].slice(0, 5);
  const referenceCount = allRefs.length;

  const rationaleMap: Record<NoveltySignal, string> = {
    not_found: "No matching literature found — hypothesis appears novel.",
    similar_exists: "Related work exists; this hypothesis offers a distinct intervention or endpoint.",
    exact_match: "High keyword overlap with existing literature — verify differentiation.",
  };

  return {
    noveltySignal,
    searchQuery,
    referenceCount,
    rationale: rationaleMap[noveltySignal],
    references: allRefs,
  };
}
