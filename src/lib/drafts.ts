import { ItemUpdateIn } from '@/types/api';

const DRAFT_KEY = 'ad-draft-';

export function saveDraft(id: string, data: Partial<ItemUpdateIn>) {
  localStorage.setItem(DRAFT_KEY + id, JSON.stringify(data));
}

export function loadDraft(id: string): Partial<ItemUpdateIn> | null {
  const raw = localStorage.getItem(DRAFT_KEY + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearDraft(id: string) {
  localStorage.removeItem(DRAFT_KEY + id);
}
