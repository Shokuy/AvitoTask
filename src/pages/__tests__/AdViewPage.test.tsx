import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdViewPage from '../AdViewPage';
import type { Item } from '@/types/api';

vi.mock('@/lib/api', () => ({
  fetchItem: vi.fn(),
}));

import { fetchItem } from '@/lib/api';
const mockFetchItem = vi.mocked(fetchItem);

function renderPage(id = '1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/ads/${id}`]}>
        <Routes>
          <Route path="/ads/:id" element={<AdViewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const completeItem: Item = {
  id: '1',
  category: 'electronics',
  title: 'MacBook Pro',
  description: 'Отличный ноутбук',
  price: 150000,
  params: { type: 'laptop', brand: 'Apple', model: 'MacBook Pro', condition: 'new', color: 'Silver' },
  needsRevision: false,
  createdAt: '2025-01-15T12:00:00Z',
};

const incompleteItem: Item = {
  id: '2',
  category: 'auto',
  title: 'BMW X5',
  price: 5000000,
  params: { brand: 'BMW' },
  needsRevision: true,
};

describe('AdViewPage', () => {
  beforeEach(() => {
    mockFetchItem.mockReset();
  });

  it('shows loading skeleton initially', () => {
    mockFetchItem.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders item title and price', async () => {
    mockFetchItem.mockResolvedValue(completeItem);
    renderPage();
    const titles = await screen.findAllByText('MacBook Pro');
    expect(titles.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/150\s*000/)).toBeInTheDocument();
  });

  it('renders description', async () => {
    mockFetchItem.mockResolvedValue(completeItem);
    renderPage();
    expect(await screen.findByText('Отличный ноутбук')).toBeInTheDocument();
  });

  it('shows edit button', async () => {
    mockFetchItem.mockResolvedValue(completeItem);
    renderPage();
    expect(await screen.findByText('Редактировать')).toBeInTheDocument();
  });

  it('shows missing fields warning for incomplete items', async () => {
    mockFetchItem.mockResolvedValue(incompleteItem);
    renderPage('2');
    expect(await screen.findByText('Требуются доработки')).toBeInTheDocument();
  });

  it('shows characteristics for complete items', async () => {
    mockFetchItem.mockResolvedValue(completeItem);
    renderPage();
    expect(await screen.findByText('Характеристики')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });

  it('shows error message on fetch failure', async () => {
    mockFetchItem.mockRejectedValue(new Error('Объявление не найдено'));
    renderPage('999');
    expect(await screen.findByText('Объявление не найдено')).toBeInTheDocument();
  });
});
