import { Item, ItemsResponse, ItemsQueryParams, ItemUpdateIn } from '@/types/api';

const API_BASE = 'http://localhost:8080';

export async function fetchItems(params: ItemsQueryParams): Promise<ItemsResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.skip !== undefined) searchParams.set('skip', String(params.skip));
  if (params.needsRevision) searchParams.set('needsRevision', 'true');
  if (params.categories) searchParams.set('categories', params.categories);
  if (params.sortColumn) searchParams.set('sortColumn', params.sortColumn);
  if (params.sortDirection) searchParams.set('sortDirection', params.sortDirection);

  const res = await fetch(`${API_BASE}/items?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Ошибка загрузки объявлений');
  return res.json();
}

export async function fetchItem(id: string): Promise<Item> {
  const res = await fetch(`${API_BASE}/items/${id}`);
  if (!res.ok) throw new Error('Объявление не найдено');
  return res.json();
}

export async function updateItem(id: string, data: ItemUpdateIn): Promise<Item> {
  const cleanParams = Object.fromEntries(
    Object.entries(data.params as Record<string, unknown>).filter(
      ([, v]) => v !== '' && v !== undefined && v !== null
    )
  );

  const res = await fetch(`${API_BASE}/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, params: cleanParams }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ? JSON.stringify(err.error) : 'Ошибка сохранения');
  }
  return res.json();
}
