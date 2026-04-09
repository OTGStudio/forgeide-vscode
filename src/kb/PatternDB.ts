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

// All 50 patterns loaded into memory at activation
const db: Pattern[] = patterns as Pattern[];

/**
 * Basic English stemming — strip common suffixes so "trees" matches "tree",
 * "pooling" matches "pool", etc. Not a full Porter stemmer, just the most
 * common game-dev-relevant suffixes.
 */
function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 4) return word.slice(0, -1);
  return word;
}

/**
 * Lexical search across name, summary, when_to_use, pitfalls.
 * Simple TF-IDF approximation: score by term frequency across fields.
 * Includes basic stemming so plurals and verb forms match.
 * No external dependencies — pure TypeScript.
 */
export function searchPatterns(query: string, limit = 5): SearchResult[] {
  const rawTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (rawTerms.length === 0) return [];

  // Build search terms: both original and stemmed forms for broader matching
  const termSets = rawTerms.map(t => {
    const stemmed = stem(t);
    return stemmed !== t ? [t, stemmed] : [t];
  });

  const scored = db.map(pattern => {
    const fields = [
      pattern.name.toLowerCase(),
      pattern.summary.toLowerCase(),
      (pattern.when_to_use ?? '').toLowerCase(),
      (pattern.pitfalls ?? '').toLowerCase(),
      pattern.domain.toLowerCase(),
      (pattern.engine_tags ?? []).join(' ').toLowerCase(),
    ].join(' ');

    const nameLower = pattern.name.toLowerCase();

    // Count term occurrences, weight by field (name hits score higher)
    let score = 0;
    for (const variants of termSets) {
      let bestNameHits = 0;
      let bestAllHits = 0;
      for (const term of variants) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameHits = (nameLower.match(new RegExp(escaped, 'g')) ?? []).length;
        const allHits  = (fields.match(new RegExp(escaped, 'g')) ?? []).length;
        bestNameHits = Math.max(bestNameHits, nameHits);
        bestAllHits = Math.max(bestAllHits, allHits);
      }
      score += bestNameHits * 3 + bestAllHits;
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
