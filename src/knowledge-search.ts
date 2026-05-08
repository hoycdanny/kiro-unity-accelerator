import { KnowledgeEntry } from './types';

/**
 * Result of a knowledge base search, including a relevance score.
 */
export interface SearchResult {
  entry: KnowledgeEntry;
  score: number;
}

/**
 * Search the knowledge base by keyword.
 *
 * Matches against entry titles and tags (case-insensitive).  Title matches
 * score higher than tag matches.  Results are returned in descending order
 * of relevance score.
 */
export function searchKnowledgeBase(
  entries: KnowledgeEntry[],
  keyword: string,
): SearchResult[] {
  if (!keyword) return [];

  const lower = keyword.toLowerCase();
  const results: SearchResult[] = [];

  for (const entry of entries) {
    let score = 0;

    // Title match (higher weight)
    if (entry.title.toLowerCase().includes(lower)) {
      score += 10;
    }

    // Tag matches
    for (const tag of entry.tags) {
      if (tag.toLowerCase().includes(lower)) {
        score += 5;
      }
    }

    if (score > 0) {
      results.push({ entry, score });
    }
  }

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Find all knowledge entries whose {@link KnowledgeEntry.relatedAssets}
 * contain the given asset path or GUID.
 */
export function findRelatedDocuments(
  entries: KnowledgeEntry[],
  assetPathOrGuid: string,
): KnowledgeEntry[] {
  if (!assetPathOrGuid) return [];

  return entries.filter((e) =>
    e.relatedAssets.some((ra) => ra === assetPathOrGuid),
  );
}
