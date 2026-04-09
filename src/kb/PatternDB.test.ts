import { describe, it, expect } from 'vitest';
import { searchPatterns, getPattern, getAllPatterns } from './PatternDB';

describe('KB Search — does the right pattern come back for real user queries?', () => {
  it('returns Object Pool when user asks about "object pool"', () => {
    const results = searchPatterns('object pool');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].pattern.name).toBe('Object Pool');
  });

  it('returns Behavior Tree when user asks about "behavior trees" (plural)', () => {
    const results = searchPatterns('behavior trees');
    const names = results.map(r => r.pattern.name);
    expect(names).toContain('Behavior Tree');
  });

  it('returns Rollback Netcode when user asks about "rollback netcode"', () => {
    const results = searchPatterns('rollback netcode');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].pattern.name).toBe('Rollback Netcode');
  });

  it('returns Object Pool when user asks "how do I manage spawning bullets"', () => {
    const results = searchPatterns('how do I manage spawning bullets');
    const names = results.map(r => r.pattern.name);
    expect(names).toContain('Object Pool');
  });

  it('returns both ECS and Component patterns for "ecs vs component"', () => {
    const results = searchPatterns('ecs vs component');
    const names = results.map(r => r.pattern.name);
    expect(names).toContain('Entity Component System');
    expect(names).toContain('Component (OOP)');
  });

  it('returns FSM for "state machine for enemy AI"', () => {
    const results = searchPatterns('state machine for enemy AI');
    const names = results.map(r => r.pattern.name);
    expect(names).toContain('Finite State Machine');
  });

  it('returns Spatial Partition for "spatial partitioning for large worlds"', () => {
    const results = searchPatterns('spatial partitioning for large worlds');
    const names = results.map(r => r.pattern.name);
    expect(names).toContain('Spatial Partition');
  });

  it('returns empty for nonsense query "xyz gibberish qwerty"', () => {
    const results = searchPatterns('xyz gibberish qwerty');
    expect(results).toHaveLength(0);
  });

  it('returns Object Pool for short query "pool"', () => {
    const results = searchPatterns('pool');
    const names = results.map(r => r.pattern.name);
    expect(names).toContain('Object Pool');
  });

  it('respects the limit parameter', () => {
    const results = searchPatterns('game', 1);
    expect(results).toHaveLength(1);
  });

  it('returns empty for empty string', () => {
    const results = searchPatterns('');
    expect(results).toHaveLength(0);
  });

  it('returns Observer for "event system"', () => {
    const results = searchPatterns('event system');
    const names = results.map(r => r.pattern.name);
    expect(names).toContain('Observer / Event System');
  });

  it('returns Dirty Flag for "dirty flag caching"', () => {
    const results = searchPatterns('dirty flag caching');
    const names = results.map(r => r.pattern.name);
    expect(names).toContain('Dirty Flag');
  });
});

describe('KB Coverage — is the full knowledge base available?', () => {
  it('has at least 50 patterns loaded', () => {
    const all = getAllPatterns();
    expect(all.length).toBeGreaterThanOrEqual(50);
  });

  it('can retrieve a pattern by ID', () => {
    const pattern = getPattern('PAT_OBJECT_POOL');
    expect(pattern).toBeDefined();
    expect(pattern!.name).toBe('Object Pool');
  });

  it('returns undefined for a nonexistent ID', () => {
    const pattern = getPattern('PAT_DOES_NOT_EXIST');
    expect(pattern).toBeUndefined();
  });

  it('every pattern has required fields', () => {
    const all = getAllPatterns();
    for (const p of all) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.domain).toBeTruthy();
      expect(p.summary).toBeTruthy();
    }
  });
});
