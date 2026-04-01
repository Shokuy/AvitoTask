import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchItems } from '@/lib/api';
import { CATEGORY_LABELS, Category } from '@/types/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ChevronLeft, ChevronRight, AlertTriangle, Package, Grid3x3, List } from 'lucide-react';
import { useState, useEffect } from 'react';
import '@/components/ProductCard.css';

const ITEMS_PER_PAGE = 10;
const CATEGORIES: Category[] = ['electronics', 'auto', 'real_estate'];

export default function AdsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    (searchParams.get('view') as 'grid' | 'list') || 'grid'
  );

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const page = Number(searchParams.get('page') || '1');
  const sortColumn = (searchParams.get('sortColumn') as 'title' | 'createdAt' | 'price') || 'createdAt';
  const sortDirection = (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc';
  const selectedCategories = searchParams.get('categories')?.split(',').filter(Boolean) as Category[] || [];
  const needsRevision = searchParams.get('needsRevision') === 'true';

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['items', debouncedSearch, page, sortColumn, sortDirection, selectedCategories.join(','), needsRevision],
    queryFn: () => fetchItems({
      q: debouncedSearch || undefined,
      limit: ITEMS_PER_PAGE,
      skip: (page - 1) * ITEMS_PER_PAGE,
      sortColumn: sortColumn === 'price' ? 'createdAt' : sortColumn,
      sortDirection,
      categories: selectedCategories.length ? selectedCategories.join(',') : undefined,
      needsRevision: needsRevision || undefined,
    }).then(result => {
      const skip = (page - 1) * ITEMS_PER_PAGE;
      let items = result.items.map((item, idx) => ({
        ...item,
        id: String(skip + idx + 1)
      }));
      
      if (sortColumn === 'price') {
        items = items.sort((a, b) => {
          const diff = a.price - b.price;
          return sortDirection === 'asc' ? diff : -diff;
        });
      }
      
      return {
        ...result,
        items
      };
    }),
  });

  const totalPages = data ? Math.ceil(data.total / ITEMS_PER_PAGE) : 0;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === '') newParams.delete(k);
      else newParams.set(k, v);
    });
    if (!updates.page) newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const toggleCategory = (cat: Category) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter(c => c !== cat)
      : [...selectedCategories, cat];
    updateParams({ categories: next.length ? next.join(',') : undefined });
  };

  const resetFilters = () => {
    setSearch('');
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Мои объявления</h1>
            {data && (
              <p className="text-muted-foreground mt-2">
                {data.total} объявлений
              </p>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <form className="flex-1 relative" onSubmit={e => e.preventDefault()}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Найти объявление..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  updateParams({ q: e.target.value || undefined });
                }}
                className="pl-9 h-10"
              />
            </form>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-10 w-10 p-0"
              >
                <Grid3x3 className="h-5 w-5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-10 w-10 p-0"
              >
                <List className="h-5 w-5" />
              </Button>
            </div>

            <Select
              value={`${sortColumn}-${sortDirection}`}
              onValueChange={v => {
                const [col, dir] = v.split('-');
                updateParams({ sortColumn: col, sortDirection: dir });
              }}
            >
              <SelectTrigger className="h-10 w-56">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Сначала новые</SelectItem>
                <SelectItem value="createdAt-asc">Сначала старые</SelectItem>
                <SelectItem value="title-asc">По названию А-Я</SelectItem>
                <SelectItem value="title-desc">По названию Я-А</SelectItem>
                <SelectItem value="price-asc">Сначала дешевле</SelectItem>
                <SelectItem value="price-desc">Сначала дороже</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="w-full md:w-60 shrink-0">
            <div className="bg-card rounded-lg border p-4 space-y-4 sticky top-6">
              <h3 className="font-semibold text-sm">Фильтры</h3>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Категория</p>
                {CATEGORIES.map(cat => (
                  <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedCategories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                    />
                    {CATEGORY_LABELS[cat]}
                  </label>
                ))}
              </div>

              <div className="border-t pt-3 flex items-center justify-between">
                <label htmlFor="needs-work" className="text-sm cursor-pointer font-medium">
                  Только требующие доработок
                </label>
                <Switch
                  id="needs-work"
                  checked={needsRevision}
                  onCheckedChange={v => updateParams({ needsRevision: v ? 'true' : undefined })}
                />
              </div>

              <Button variant="outline" size="sm" className="w-full" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Ошибка загрузки: {(error as Error).message}
              </div>
            )}

            {isLoading ? (
              <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center" : "space-y-4"}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <article key={i} className={`product-card ${viewMode === 'list' ? 'product-card--list' : 'product-card--grid'}`}>
                    <div className="product-card__media">
                      <Skeleton className="h-full w-full" />
                    </div>
                    <div className="product-card__body">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-full mt-2" />
                      <Skeleton className="h-5 w-24 mt-2" />
                    </div>
                  </article>
                ))}
              </div>
            ) : data?.items.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="mx-auto h-12 w-12 mb-3 opacity-40" />
                <p className="text-lg font-medium">Объявлений не найдено</p>
                <p className="text-sm">Попробуйте изменить параметры поиска</p>
              </div>
            ) : (
              <>
                <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center" : "space-y-3"}>
                  {data?.items.map(item => (
                    <article
                      key={item.id}
                      className={`product-card ${viewMode === 'list' ? 'product-card--list' : 'product-card--grid'}`}
                      onClick={() => navigate(`/ads/${item.id}`)}
                    >
                      <div className="product-card__media">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="product-card__image" />
                        ) : (
                          <Package className="h-12 w-12 text-gray-300" />
                        )}
                      </div>
                      <div className="product-card__body">
                        <span className="product-card__category">
                          {CATEGORY_LABELS[item.category]}
                        </span>
                        <h3 className="product-card__title">
                          {item.title}
                        </h3>
                        <p className="product-card__price">
                          {item.price.toLocaleString('ru-RU')} ₽
                        </p>
                        {item.needsRevision && (
                          <div className="product-card__badge">
                            Требует доработок
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-start gap-1 mt-8">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      disabled={page <= 1}
                      onClick={() => updateParams({ page: String(page - 1) })}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'outline'}
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => updateParams({ page: String(p) })}
                      >
                        {p}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      disabled={page >= totalPages}
                      onClick={() => updateParams({ page: String(page + 1) })}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
