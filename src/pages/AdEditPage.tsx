import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchItem, updateItem } from '@/lib/api';
import { saveDraft, loadDraft, clearDraft } from '@/lib/drafts';
import { CATEGORY_LABELS, Category, ItemUpdateIn, AutoItemParams, RealEstateItemParams, ElectronicsItemParams } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, Sparkles, DollarSign, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CATEGORIES: Category[] = ['electronics', 'auto', 'real_estate'];

export default function AdEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const formInitialized = useRef(false);

  const [form, setForm] = useState<ItemUpdateIn>({
    category: 'electronics',
    title: '',
    description: '',
    price: 0,
    params: {},
  });

  const [aiDescription, setAiDescription] = useState('');
  const [aiPrice, setAiPrice] = useState('');
  const [aiLoading, setAiLoading] = useState<'description' | 'price' | null>(null);

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['item', id],
    queryFn: () => fetchItem(id!),
    enabled: !!id,
  });

  // Initialize form from item or draft
  useEffect(() => {
    if (item && !formInitialized.current) {
      formInitialized.current = true;
      const draft = loadDraft(id!);
      if (draft) {
        setForm({
          category: draft.category || item.category,
          title: draft.title || item.title,
          description: draft.description ?? item.description ?? '',
          price: draft.price ?? item.price,
          params: draft.params || item.params || {},
        });
        toast({ title: 'Черновик восстановлен', description: 'Найден сохранённый черновик' });
      } else {
        setForm({
          category: item.category,
          title: item.title,
          description: item.description || '',
          price: item.price,
          params: item.params || {},
        });
      }
    }
  }, [item, id, toast]);

  // Autosave draft
  const saveDraftTimeout = useRef<NodeJS.Timeout>();
  useEffect(() => {
    if (!formInitialized.current) return;
    clearTimeout(saveDraftTimeout.current);
    saveDraftTimeout.current = setTimeout(() => {
      saveDraft(id!, form);
    }, 500);
    return () => clearTimeout(saveDraftTimeout.current);
  }, [form, id]);

  const mutation = useMutation({
    mutationFn: (data: ItemUpdateIn) => updateItem(id!, data),
    onSuccess: () => {
      clearDraft(id!);
      queryClient.invalidateQueries({ queryKey: ['item', id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({ title: 'Сохранено!' });
      navigate(`/ads/${id}`);
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    },
  });

  const updateField = useCallback(<K extends keyof ItemUpdateIn>(key: K, value: ItemUpdateIn[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateParam = useCallback((key: string, value: unknown) => {
    setForm(prev => ({ ...prev, params: { ...prev.params, [key]: value } }));
  }, []);

  const handleCategoryChange = (cat: Category) => {
    setForm(prev => ({ ...prev, category: cat, params: {} }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: 'Ошибка', description: 'Название обязательно', variant: 'destructive' });
      return;
    }
    if (form.price <= 0) {
      toast({ title: 'Ошибка', description: 'Укажите корректную цену', variant: 'destructive' });
      return;
    }
    mutation.mutate(form);
  };

  const requestAI = async (type: 'description' | 'price') => {
    setAiLoading(type);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { type, item: form },
      });
      if (error) throw error;
      if (type === 'description') {
        setAiDescription(data.result);
      } else {
        setAiPrice(data.result);
      }
    } catch (err) {
      toast({ title: 'Ошибка AI', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setAiLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {(error as Error).message}
        </div>
      </div>
    );
  }

  const params = form.params as Record<string, unknown>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/ads/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Назад
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Редактирование объявления</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-lg border p-6 space-y-6">
        {/* Category */}
        <div className="space-y-2">
          <Label>Категория *</Label>
          <Select value={form.category} onValueChange={(v) => handleCategoryChange(v as Category)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label>Название *</Label>
          <Input value={form.title} onChange={e => updateField('title', e.target.value)} />
        </div>

        {/* Price */}
        <div className="space-y-2">
          <Label>Цена *</Label>
          <Input
            type="number"
            min={0}
            value={form.price}
            onChange={e => updateField('price', Number(e.target.value))}
          />
        </div>

        {/* Category-specific params */}
        <CategoryParams category={form.category} params={params} updateParam={updateParam} />

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Описание</Label>
            <span className="text-xs text-muted-foreground">{(form.description || '').length} символов</span>
          </div>
          <Textarea
            value={form.description || ''}
            onChange={e => updateField('description', e.target.value)}
            rows={5}
            placeholder="Добавьте описание вашего товара..."
          />
        </div>

        {/* AI Section */}
        <div className="border-t pt-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI-ассистент
          </h3>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={aiLoading !== null}
              onClick={() => requestAI('description')}
            >
              {aiLoading === 'description' ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              {form.description ? 'Улучшить описание' : 'Придумать описание'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={aiLoading !== null}
              onClick={() => requestAI('price')}
            >
              {aiLoading === 'price' ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4 mr-1" />
              )}
              Узнать рыночную цену
            </Button>
          </div>

          {aiDescription && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Предложенное описание:</p>
              <p className="text-sm whitespace-pre-wrap">{aiDescription}</p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  updateField('description', aiDescription);
                  setAiDescription('');
                  toast({ title: 'Описание применено' });
                }}
              >
                Применить
              </Button>
            </div>
          )}

          {aiPrice && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Рекомендация по цене:</p>
              <p className="text-sm">{aiPrice}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t pt-6 flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Сохранить
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(`/ads/${id}`)}>
            Отменить
          </Button>
        </div>
      </form>
    </div>
  );
}

function CategoryParams({ category, params, updateParam }: {
  category: Category;
  params: Record<string, unknown>;
  updateParam: (key: string, value: unknown) => void;
}) {
  if (category === 'auto') {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Марка</Label>
          <Input value={(params.brand as string) || ''} onChange={e => updateParam('brand', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Модель</Label>
          <Input value={(params.model as string) || ''} onChange={e => updateParam('model', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Год выпуска</Label>
          <Input type="number" value={(params.yearOfManufacture as number) || ''} onChange={e => updateParam('yearOfManufacture', Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>КПП</Label>
          <Select value={(params.transmission as string) || ''} onValueChange={v => updateParam('transmission', v)}>
            <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="automatic">Автомат</SelectItem>
              <SelectItem value="manual">Механика</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Пробег (км)</Label>
          <Input type="number" value={(params.mileage as number) || ''} onChange={e => updateParam('mileage', Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Мощность (л.с.)</Label>
          <Input type="number" value={(params.enginePower as number) || ''} onChange={e => updateParam('enginePower', Number(e.target.value))} />
        </div>
      </div>
    );
  }

  if (category === 'real_estate') {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Тип</Label>
          <Select value={(params.type as string) || ''} onValueChange={v => updateParam('type', v)}>
            <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Квартира</SelectItem>
              <SelectItem value="house">Дом</SelectItem>
              <SelectItem value="room">Комната</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Адрес</Label>
          <Input value={(params.address as string) || ''} onChange={e => updateParam('address', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Площадь (м²)</Label>
          <Input type="number" value={(params.area as number) || ''} onChange={e => updateParam('area', Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Этаж</Label>
          <Input type="number" value={(params.floor as number) || ''} onChange={e => updateParam('floor', Number(e.target.value))} />
        </div>
      </div>
    );
  }

  // electronics
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Тип</Label>
        <Select value={(params.type as string) || ''} onValueChange={v => updateParam('type', v)}>
          <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="phone">Телефон</SelectItem>
            <SelectItem value="laptop">Ноутбук</SelectItem>
            <SelectItem value="misc">Другое</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Бренд</Label>
        <Input value={(params.brand as string) || ''} onChange={e => updateParam('brand', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Модель</Label>
        <Input value={(params.model as string) || ''} onChange={e => updateParam('model', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Состояние</Label>
        <Select value={(params.condition as string) || ''} onValueChange={v => updateParam('condition', v)}>
          <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Новое</SelectItem>
            <SelectItem value="used">Б/У</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Цвет</Label>
        <Input value={(params.color as string) || ''} onChange={e => updateParam('color', e.target.value)} />
      </div>
    </div>
  );
}
