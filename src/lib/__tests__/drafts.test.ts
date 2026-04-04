import { describe, it, expect, beforeEach } from 'vitest';
import { saveDraft, loadDraft, clearDraft } from '../drafts';

beforeEach(() => {
  localStorage.clear();
});

describe('saveDraft', () => {
  it('saves data to localStorage under the correct key', () => {
    saveDraft('42', { title: 'Test', price: 100 });
    expect(localStorage.getItem('ad-draft-42')).toBe(
      JSON.stringify({ title: 'Test', price: 100 }),
    );
  });

  it('overwrites previous draft for the same id', () => {
    saveDraft('1', { title: 'Old' });
    saveDraft('1', { title: 'New' });
    expect(JSON.parse(localStorage.getItem('ad-draft-1')!).title).toBe('New');
  });
});

describe('loadDraft', () => {
  it('returns null when no draft exists', () => {
    expect(loadDraft('999')).toBeNull();
  });

  it('returns parsed draft data', () => {
    localStorage.setItem('ad-draft-5', JSON.stringify({ title: 'Hello', price: 500 }));
    const draft = loadDraft('5');
    expect(draft).toEqual({ title: 'Hello', price: 500 });
  });

  it('returns null for corrupted JSON', () => {
    localStorage.setItem('ad-draft-bad', '{broken');
    expect(loadDraft('bad')).toBeNull();
  });
});

describe('clearDraft', () => {
  it('removes the draft from localStorage', () => {
    localStorage.setItem('ad-draft-7', JSON.stringify({ title: 'x' }));
    clearDraft('7');
    expect(localStorage.getItem('ad-draft-7')).toBeNull();
  });

  it('does not throw when clearing a non-existent draft', () => {
    expect(() => clearDraft('nonexistent')).not.toThrow();
  });
});
