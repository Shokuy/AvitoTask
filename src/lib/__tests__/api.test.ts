import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchItems, fetchItem, updateItem } from '../api';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('fetchItems', () => {
  it('builds query string from params and returns data', async () => {
    const payload = { items: [], total: 0 };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) });

    const result = await fetchItems({ q: 'phone', limit: 10, skip: 0 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('q=phone');
    expect(url).toContain('limit=10');
    expect(url).toContain('skip=0');
    expect(result).toEqual(payload);
  });

  it('includes optional filter params', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], total: 0 }) });

    await fetchItems({ needsRevision: true, categories: 'auto,electronics', sortColumn: 'price', sortDirection: 'asc' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('needsRevision=true');
    expect(url).toContain('categories=auto%2Celectronics');
    expect(url).toContain('sortColumn=price');
    expect(url).toContain('sortDirection=asc');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchItems({})).rejects.toThrow('Ошибка загрузки объявлений');
  });
});

describe('fetchItem', () => {
  it('fetches a single item by id', async () => {
    const item = { id: '1', title: 'Test' };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(item) });

    const result = await fetchItem('1');
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/items/1');
    expect(result).toEqual(item);
  });

  it('throws on not found', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    await expect(fetchItem('999')).rejects.toThrow('Объявление не найдено');
  });
});

describe('updateItem', () => {
  it('sends PUT with cleaned params and returns item', async () => {
    const updated = { id: '1', title: 'Updated' };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(updated) });

    const result = await updateItem('1', {
      category: 'auto',
      title: 'Updated',
      description: '',
      price: 5000,
      params: { brand: 'BMW', model: '', empty: undefined, ok: 'yes' },
    });

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/items/1', expect.objectContaining({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.params).toEqual({ brand: 'BMW', ok: 'yes' });
    expect(body.params.model).toBeUndefined();
    expect(result).toEqual(updated);
  });

  it('throws with server error message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Validation failed' }),
    });

    await expect(
      updateItem('1', { category: 'auto', title: 'x', description: '', price: 1, params: {} }),
    ).rejects.toThrow('Validation failed');
  });

  it('throws generic message when error body is missing', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('no json')),
    });

    await expect(
      updateItem('1', { category: 'auto', title: 'x', description: '', price: 1, params: {} }),
    ).rejects.toThrow('Ошибка сохранения');
  });
});
