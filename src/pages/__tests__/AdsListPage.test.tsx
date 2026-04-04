import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AdsListPage from '../AdsListPage';
import type { ItemsResponse } from '@/types/api';

vi.mock('@/lib/api', () => ({
  fetchItems: vi.fn(),
}));

vi.mock('@/lib/drafts', () => ({
  loadDraft: vi.fn(() => null),
}));

import { fetchItems } from '@/lib/api';
const mockFetchItems = vi.mocked(fetchItems);

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/ads']}>
        <AdsListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const sampleResponse: ItemsResponse = {
  items: [
    {
      id: '1',
      category: 'electronics',
      title: 'iPhone 15',
      price: 90000,
      params: { type: 'phone', brand: 'Apple' },
      needsRevision: false,
    },
    {
      id: '2',
      category: 'auto',
      title: 'BMW X5',
      price: 5000000,
      params: { brand: 'BMW' },
      needsRevision: true,
    },
  ],
  total: 2,
};

describe('AdsListPage', () => {
  beforeEach(() => {
    mockFetchItems.mockReset();
  });

  it('shows loading skeletons initially', () => {
    mockFetchItems.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Мои объявления')).toBeInTheDocument();
  });

  it('renders items after data loads', async () => {
    mockFetchItems.mockResolvedValue(sampleResponse);
    renderPage();
    expect(await screen.findByText('iPhone 15')).toBeInTheDocument();
    expect(screen.getByText('BMW X5')).toBeInTheDocument();
  });

  it('shows total count', async () => {
    mockFetchItems.mockResolvedValue(sampleResponse);
    renderPage();
    expect(await screen.findByText('2 объявлений')).toBeInTheDocument();
  });

  it('shows search input', () => {
    mockFetchItems.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByPlaceholderText('Найти объявление...')).toBeInTheDocument();
  });

  it('shows "Требует доработок" badge for revision items', async () => {
    mockFetchItems.mockResolvedValue(sampleResponse);
    renderPage();
    expect(await screen.findByText('Требует доработок')).toBeInTheDocument();
  });
});
