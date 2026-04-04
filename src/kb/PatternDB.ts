import patterns from '../../assets/patterns.json';

export interface Pattern {
  id: string;
  name: string;
  domain: string;
  summary: string;
  when_to_use?: string;
  pitfalls?: string;
  complexity?: number;
  engine_tags?: string[];
  genre_tags?: string[];
}

export interface SearchResult {
  pattern: Pattern;
  score: number;
}

// All 40 patterns loaded into memory at activation
const db: Pattern[] = patterns as Pattern[];

/**
 * Lexical search across name, summary, when_to_use, pitfalls.
 * Simple TF-IDF approximation: score by term frequency across fields.
 * No external dependencies — pure TypeScript.
 */
export function searchPatterns(query: string, limit = 5): SearchResult[] {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) return [];

  const scored = db.map(pattern => {
    const fields = [
      pattern.name.toLowerCase(),
      pattern.summary.toLowerCase(),
      (pattern.when_to_use ?? '').toLowerCase(),
      (pattern.pitfalls ?? '').toLowerCase(),
      pattern.domain.toLowerCase(),
      (pattern.engine_tags ?? []).join(' ').toLowerCase(),
    ].join(' ');

    // Count term occurrences, weight by field (name hits score higher)
    let score = 0;
    for (const term of terms) {
      const nameHits = (pattern.name.toLowerCase().match(new RegExp(term, 'g')) ?? []).length;
      const allHits  = (fields.match(new RegExp(term, 'g')) ?? []).length;
      score += nameHits * 3 + allHits;
    }
    return { pattern, score };
  });

  return scored
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getPattern(id: string): Pattern | undefined {
  return db.find(p => p.id === id);
}

export function getAllPatterns(): Pattern[] {
  return db;
}
