import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchItem } from '@/lib/api';
import { CATEGORY_LABELS, Category, AutoItemParams, RealEstateItemParams, ElectronicsItemParams } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, Edit, Package, Calendar } from 'lucide-react';

function getParamLabels(category: Category, params: Record<string, unknown>): { label: string; value: string }[] {
  const result: { label: string; value: string }[] = [];
  if (category === 'auto') {
    const p = params as AutoItemParams;
    if (p.brand) result.push({ label: 'Марка', value: p.brand });
    if (p.model) result.push({ label: 'Модель', value: p.model });
    if (p.yearOfManufacture) result.push({ label: 'Год выпуска', value: String(p.yearOfManufacture) });
    if (p.transmission) result.push({ label: 'КПП', value: p.transmission === 'automatic' ? 'Автомат' : 'Механика' });
    if (p.mileage) result.push({ label: 'Пробег', value: `${p.mileage.toLocaleString('ru-RU')} км` });
    if (p.enginePower) result.push({ label: 'Мощность', value: `${p.enginePower} л.с.` });
  } else if (category === 'real_estate') {
    const p = params as RealEstateItemParams;
    if (p.type) result.push({ label: 'Тип', value: p.type === 'flat' ? 'Квартира' : p.type === 'house' ? 'Дом' : 'Комната' });
    if (p.address) result.push({ label: 'Адрес', value: p.address });
    if (p.area) result.push({ label: 'Площадь', value: `${p.area} м²` });
    if (p.floor) result.push({ label: 'Этаж', value: String(p.floor) });
  } else {
    const p = params as ElectronicsItemParams;
    if (p.type) result.push({ label: 'Тип', value: p.type === 'phone' ? 'Телефон' : p.type === 'laptop' ? 'Ноутбук' : 'Другое' });
    if (p.brand) result.push({ label: 'Бренд', value: p.brand });
    if (p.model) result.push({ label: 'Модель', value: p.model });
    if (p.condition) result.push({ label: 'Состояние', value: p.condition === 'new' ? 'Новое' : 'Б/У' });
    if (p.color) result.push({ label: 'Цвет', value: p.color });
  }
  return result;
}

function getMissingFields(category: Category, item: Record<string, unknown>): string[] {
  const missing: string[] = [];
  if (!item.description) missing.push('Описание');
  const params = (item.params || {}) as Record<string, unknown>;

  if (category === 'auto') {
    if (!params.brand) missing.push('Марка');
    if (!params.model) missing.push('Модель');
    if (!params.yearOfManufacture) missing.push('Год выпуска');
    if (!params.transmission) missing.push('КПП');
    if (!params.mileage) missing.push('Пробег');
    if (!params.enginePower) missing.push('Мощность');
  } else if (category === 'real_estate') {
    if (!params.type) missing.push('Тип');
    if (!params.address) missing.push('Адрес');
    if (!params.area) missing.push('Площадь');
    if (!params.floor) missing.push('Этаж');
  } else {
    if (!params.type) missing.push('Тип');
    if (!params.brand) missing.push('Бренд');
    if (!params.model) missing.push('Модель');
    if (!params.condition) missing.push('Состояние');
    if (!params.color) missing.push('Цвет');
  }
  return missing;
}

export default function AdViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['item', id],
    queryFn: () => fetchItem(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full rounded-lg mb-6" />
        <div className="space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {(error as Error)?.message || 'Объявление не найдено'}
        </div>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/ads')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          К списку
        </Button>
      </div>
    );
  }

  const paramLabels = getParamLabels(item.category, item.params as Record<string, unknown>);
  const missingFields = getMissingFields(item.category, item as unknown as Record<string, unknown>);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/ads">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Назад
          </Link>
        </Button>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        {/* Image */}
        <div className="h-64 bg-muted flex items-center justify-center">
          {item.image ? (
            <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <Package className="h-16 w-16 text-muted-foreground/30" />
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2">
              <Badge variant="secondary">{CATEGORY_LABELS[item.category]}</Badge>
              <h1 className="text-2xl font-bold">{item.title}</h1>
              <p className="text-3xl font-bold text-primary">
                {item.price.toLocaleString('ru-RU')} ₽
              </p>
              {item.createdAt && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(item.createdAt).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              )}
            </div>
            <Button onClick={() => navigate(`/ads/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
          </div>

          {/* Missing fields warning */}
          {missingFields.length > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <div className="flex items-center gap-2 font-medium text-sm mb-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Требуются доработки
              </div>
              <p className="text-sm text-muted-foreground">
                Не заполнены: {missingFields.join(', ')}
              </p>
            </div>
          )}

          {/* Params */}
          {paramLabels.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">Характеристики</h2>
              <div className="grid grid-cols-2 gap-2">
                {paramLabels.map(p => (
                  <div key={p.label} className="flex justify-between bg-muted/50 rounded px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{p.label}</span>
                    <span className="font-medium">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {item.description && (
            <div>
              <h2 className="font-semibold mb-2">Описание</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
