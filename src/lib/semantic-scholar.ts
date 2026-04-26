const BASE = "https://api.semanticscholar.org/graph/v1/paper/search";

export async function searchLiterature(query: string) {
  const url = `${BASE}?query=${encodeURIComponent(query)}&fields=title,authors,year,externalIds,openAccessPdf&limit=5`;
  const res = await fetch(url, { headers: { "User-Agent": "OperonAI/1.0" } });
  if (!res.ok) return { papers: [] };
  const data = await res.json() as { data?: unknown[] };
  return { papers: data.data ?? [] };
}
