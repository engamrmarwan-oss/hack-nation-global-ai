const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

type TavilySearchResult = {
  title: string;
  url: string;
  content?: string;
  score?: number;
  raw_content?: string;
};

type TavilyResponse = {
  answer?: string;
  results?: TavilySearchResult[];
  response_time?: number;
};

export class TavilyConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TavilyConfigurationError";
  }
}

export async function searchScientificEvidence(query: string) {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new TavilyConfigurationError(
      "Tavily is not configured yet. Add TAVILY_API_KEY before running live evidence retrieval.",
    );
  }

  const response = await fetch(TAVILY_SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      topic: "general",
      search_depth: "advanced",
      max_results: 5,
      chunks_per_source: 3,
      include_answer: "advanced",
      include_raw_content: "text",
      include_domains: [
        "nature.com",
        "science.org",
        "cell.com",
        "nih.gov",
        "pubmed.ncbi.nlm.nih.gov",
        "pmc.ncbi.nlm.nih.gov",
        "protocols.io",
        "bio-protocol.org",
        "jove.com",
        "biorxiv.org",
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Tavily search failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as TavilyResponse;
  const results = payload.results ?? [];

  return {
    answer: payload.answer ?? null,
    responseTime: payload.response_time ?? null,
    results: results.map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.content ?? result.raw_content ?? "",
      relevanceScore: result.score ?? null,
    })),
  };
}

export async function searchProtocolSources(experimentClass: string, keyTerms: string[]) {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new TavilyConfigurationError(
      "Tavily is not configured yet. Add TAVILY_API_KEY before running live evidence retrieval.",
    );
  }

  const query = `${keyTerms.slice(0, 5).join(" ")} ${experimentClass} protocol`;

  const response = await fetch(TAVILY_SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      topic: "general",
      search_depth: "advanced",
      max_results: 5,
      chunks_per_source: 3,
      include_answer: "advanced",
      include_raw_content: "text",
      include_domains: [
        "protocols.io",
        "bio-protocol.org",
        "nature.com",
        "jove.com",
        "pubmed.ncbi.nlm.nih.gov",
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Tavily protocol search failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as TavilyResponse;
  const results = payload.results ?? [];

  return {
    answer: payload.answer ?? null,
    results: results.map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.content ?? result.raw_content ?? "",
      relevanceScore: result.score ?? null,
    })),
  };
}
