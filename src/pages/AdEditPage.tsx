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
import { AlertTriangle, ArrowLeft, Lightbulb, Loader2, X } from 'lucide-react';
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
      toast({ title: 'Изменения сохранены', variant: 'success' as any });
      navigate(`/ads/${id}`);
    },
    onError: () => {
      toast({
        title: 'Ошибка сохранения',
        description: 'При попытке сохранить изменения произошла ошибка. Попробуйте ещё раз или зайдите позже.',
        variant: 'destructive',
      });
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
      <div className="min-h-screen bg-white px-8 lg:px-16 py-8" style={{ maxWidth: '680px' }}>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white px-8 lg:px-16 py-8">
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {(error as Error).message}
        </div>
      </div>
    );
  }

  const params = form.params as Record<string, unknown>;

  const aiButtonClass = "inline-flex items-center gap-1.5 text-sm font-medium rounded-full px-4 py-2 transition-colors border-none cursor-pointer";

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto px-8 py-8" style={{ maxWidth: '680px' }}>
        <h1 className="text-2xl font-bold mb-8">Редактирование объявления</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">Категория</Label>
            <Select value={form.category} onValueChange={(v) => handleCategoryChange(v as Category)}>
              <SelectTrigger className="bg-white border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">
              <span className="text-red-500 mr-0.5">*</span> Название
            </Label>
            <div className="relative">
              <Input
                value={form.title}
                onChange={e => updateField('title', e.target.value)}
                className={`bg-white border-gray-300 pr-8 ${!form.title.trim() ? 'border-amber-400' : ''}`}
              />
              {form.title && (
                <button type="button" onClick={() => updateField('title', '')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">
              <span className="text-red-500 mr-0.5">*</span> Цена
            </Label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={e => updateField('price', Number(e.target.value))}
                  className={`bg-white border-gray-300 pr-8 ${!form.price ? 'border-amber-400' : ''}`}
                />
                {form.price > 0 && (
                  <button type="button" onClick={() => updateField('price', 0)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                disabled={aiLoading !== null}
                onClick={() => requestAI('price')}
                className={aiButtonClass}
                style={{ backgroundColor: '#FFF3E0', color: '#E67E22', whiteSpace: 'nowrap' }}
              >
                {aiLoading === 'price' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lightbulb className="h-4 w-4" />
                )}
                Узнать рыночную цену
              </button>
            </div>
          </div>

          {aiPrice && (
            <div className="rounded-xl p-4 text-sm space-y-2" style={{ backgroundColor: '#FFF8F0', border: '1px solid #FDEBD0' }}>
              <p className="font-medium">Ответ AI:</p>
              <p className="text-gray-600 whitespace-pre-wrap">{aiPrice}</p>
              <div className="flex items-center gap-2 mt-2">
                <Button type="button" size="sm" className="rounded-full px-4" onClick={() => {
                  const match = aiPrice.match(/[\d\s]+/);
                  if (match) {
                    const price = Number(match[0].replace(/\s/g, ''));
                    if (price > 0) updateField('price', price);
                  }
                  toast({ title: 'Цена применена' });
                }}>
                  Применить
                </Button>
                <button type="button" className="text-sm text-gray-500 hover:text-gray-700" onClick={() => setAiPrice('')}>
                  Закрыть
                </button>
              </div>
              <button
                type="button"
                disabled={aiLoading !== null}
                onClick={() => requestAI('price')}
                className={aiButtonClass + ' mt-1'}
                style={{ backgroundColor: '#FFF3E0', color: '#E67E22' }}
              >
                {aiLoading === 'price' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lightbulb className="h-4 w-4" />
                )}
                Повторить запрос
              </button>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-base font-semibold">Характеристики</h2>
            <CategoryParams category={form.category} params={params} updateParam={updateParam} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">Описание</Label>
            <div className="relative">
              <Textarea
                value={form.description || ''}
                onChange={e => updateField('description', e.target.value)}
                rows={4}
                maxLength={1000}
                className="bg-white border-gray-300 resize-none"
              />
              <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                {(form.description || '').length} / 1000
              </span>
            </div>
            <button
              type="button"
              disabled={aiLoading !== null}
              onClick={() => requestAI('description')}
              className={aiButtonClass}
              style={{ backgroundColor: '#FFF3E0', color: '#E67E22' }}
            >
              {aiLoading === 'description' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="h-4 w-4" />
              )}
              {form.description ? 'Улучшить описание' : 'Придумать описание'}
            </button>
          </div>

          {aiDescription && (
            <div className="rounded-xl p-4 text-sm space-y-2" style={{ backgroundColor: '#FFF8F0', border: '1px solid #FDEBD0' }}>
              <p className="font-medium">Предложенное описание:</p>
              <p className="text-gray-600 whitespace-pre-wrap">{aiDescription}</p>
              <div className="flex items-center gap-2 mt-2">
                <Button type="button" size="sm" className="rounded-full px-4" onClick={() => {
                  updateField('description', aiDescription);
                  setAiDescription('');
                  toast({ title: 'Описание применено' });
                }}>
                  Применить
                </Button>
                <button type="button" className="text-sm text-gray-500 hover:text-gray-700" onClick={() => setAiDescription('')}>
                  Закрыть
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={mutation.isPending} className="rounded-full px-6">
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Сохранить
            </Button>
            <Button type="button" variant="outline" className="rounded-full px-6" onClick={() => navigate(`/ads/${id}`)}>
              Отменить
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClearableInput({ value, onChange, onClear, warn, ...props }: {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  warn?: boolean;
} & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'>) {
  const hasValue = value !== '' && value !== 0;
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={onChange}
        className={`bg-white border-gray-300 pr-8 ${warn && !hasValue ? 'border-amber-400' : ''}`}
        {...props}
      />
      {hasValue && (
        <button type="button" onClick={onClear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function CategoryParams({ category, params, updateParam }: {
  category: Category;
  params: Record<string, unknown>;
  updateParam: (key: string, value: unknown) => void;
}) {
  const fieldClass = "space-y-1.5";
  const labelClass = "text-sm text-gray-600";
  const inputClass = "bg-white border-gray-300";

  const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
    <Label className={labelClass}><span className="text-red-500 mr-0.5">*</span> {children}</Label>
  );
  const OptionalLabel = ({ children }: { children: React.ReactNode }) => (
    <Label className={labelClass}>{children}</Label>
  );

  const warnClass = (val: unknown) => !val ? 'border-amber-400' : '';

  if (category === 'auto') {
    return (
      <div className="space-y-4">
        <div className={fieldClass}>
          <OptionalLabel>Марка</OptionalLabel>
          <ClearableInput warn value={(params.brand as string) || ''} onChange={e => updateParam('brand', e.target.value)} onClear={() => updateParam('brand', '')} />
        </div>
        <div className={fieldClass}>
          <OptionalLabel>Модель</OptionalLabel>
          <ClearableInput warn value={(params.model as string) || ''} onChange={e => updateParam('model', e.target.value)} onClear={() => updateParam('model', '')} />
        </div>
        <div className={fieldClass}>
          <OptionalLabel>Год выпуска</OptionalLabel>
          <ClearableInput warn type="number" value={(params.yearOfManufacture as number) || ''} onChange={e => updateParam('yearOfManufacture', Number(e.target.value))} onClear={() => updateParam('yearOfManufacture', '')} />
        </div>
        <div className={fieldClass}>
          <OptionalLabel>КПП</OptionalLabel>
          <Select value={(params.transmission as string) || ''} onValueChange={v => updateParam('transmission', v)}>
            <SelectTrigger className={`${inputClass} ${warnClass(params.transmission)}`}><SelectValue placeholder="Выберите" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="automatic">Автомат</SelectItem>
              <SelectItem value="manual">Механика</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className={fieldClass}>
          <OptionalLabel>Пробег (км)</OptionalLabel>
          <ClearableInput warn type="number" value={(params.mileage as number) || ''} onChange={e => updateParam('mileage', Number(e.target.value))} onClear={() => updateParam('mileage', '')} />
        </div>
        <div className={fieldClass}>
          <OptionalLabel>Мощность (л.с.)</OptionalLabel>
          <ClearableInput warn type="number" value={(params.enginePower as number) || ''} onChange={e => updateParam('enginePower', Number(e.target.value))} onClear={() => updateParam('enginePower', '')} />
        </div>
      </div>
    );
  }

  if (category === 'real_estate') {
    return (
      <div className="space-y-4">
        <div className={fieldClass}>
          <RequiredLabel>Тип</RequiredLabel>
          <Select value={(params.type as string) || ''} onValueChange={v => updateParam('type', v)}>
            <SelectTrigger className={`${inputClass} ${warnClass(params.type)}`}><SelectValue placeholder="Выберите" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Квартира</SelectItem>
              <SelectItem value="house">Дом</SelectItem>
              <SelectItem value="room">Комната</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className={fieldClass}>
          <OptionalLabel>Адрес</OptionalLabel>
          <ClearableInput warn value={(params.address as string) || ''} onChange={e => updateParam('address', e.target.value)} onClear={() => updateParam('address', '')} />
        </div>
        <div className={fieldClass}>
          <OptionalLabel>Площадь (м²)</OptionalLabel>
          <ClearableInput warn type="number" value={(params.area as number) || ''} onChange={e => updateParam('area', Number(e.target.value))} onClear={() => updateParam('area', '')} />
        </div>
        <div className={fieldClass}>
          <OptionalLabel>Этаж</OptionalLabel>
          <ClearableInput warn type="number" value={(params.floor as number) || ''} onChange={e => updateParam('floor', Number(e.target.value))} onClear={() => updateParam('floor', '')} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={fieldClass}>
        <RequiredLabel>Тип</RequiredLabel>
        <Select value={(params.type as string) || ''} onValueChange={v => updateParam('type', v)}>
          <SelectTrigger className={`${inputClass} ${warnClass(params.type)}`}><SelectValue placeholder="Выберите" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="phone">Телефон</SelectItem>
            <SelectItem value="laptop">Ноутбук</SelectItem>
            <SelectItem value="misc">Другое</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className={fieldClass}>
        <OptionalLabel>Бренд</OptionalLabel>
        <ClearableInput warn value={(params.brand as string) || ''} onChange={e => updateParam('brand', e.target.value)} onClear={() => updateParam('brand', '')} />
      </div>
      <div className={fieldClass}>
        <OptionalLabel>Модель</OptionalLabel>
        <ClearableInput warn value={(params.model as string) || ''} onChange={e => updateParam('model', e.target.value)} onClear={() => updateParam('model', '')} />
      </div>
      <div className={fieldClass}>
        <OptionalLabel>Цвет</OptionalLabel>
        <ClearableInput warn value={(params.color as string) || ''} onChange={e => updateParam('color', e.target.value)} onClear={() => updateParam('color', '')} />
      </div>
      <div className={fieldClass}>
        <OptionalLabel>Состояние</OptionalLabel>
        <Select value={(params.condition as string) || ''} onValueChange={v => updateParam('condition', v)}>
          <SelectTrigger className={`${inputClass} ${warnClass(params.condition)}`}><SelectValue placeholder="Выберите" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Новое</SelectItem>
            <SelectItem value="used">Б/У</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
