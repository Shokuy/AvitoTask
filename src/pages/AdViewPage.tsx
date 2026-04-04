import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchItem } from '@/lib/api';
import { Category, AutoItemParams, RealEstateItemParams, ElectronicsItemParams } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, Package } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

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
    queryFn: ({ signal }) => fetchItem(id!, signal),
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) +
      ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-background px-8 lg:px-16 pt-6 pb-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/ads">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Назад
            </Link>
          </Button>
          <ThemeToggle />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-3">{item.title}</h1>
            <Button onClick={() => navigate(`/ads/${id}/edit`)}>
              Редактировать
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                <path d="M2.92701 12.8571C2.96719 12.8571 3.00737 12.8531 3.04755 12.8471L6.42656 12.2545C6.46674 12.2464 6.50491 12.2283 6.53304 12.1982L15.0489 3.68237C15.0675 3.66378 15.0823 3.64171 15.0924 3.6174C15.1024 3.5931 15.1076 3.56705 15.1076 3.54074C15.1076 3.51443 15.1024 3.48837 15.0924 3.46407C15.0823 3.43977 15.0675 3.41769 15.0489 3.39911L11.71 0.058259C11.6719 0.0200893 11.6217 0 11.5674 0C11.5132 0 11.4629 0.0200893 11.4248 0.058259L2.90893 8.57411C2.87879 8.60424 2.86071 8.6404 2.85268 8.68058L2.26004 12.0596C2.2405 12.1672 2.24748 12.278 2.28039 12.3823C2.31329 12.4866 2.37113 12.5813 2.44888 12.6583C2.58147 12.7868 2.74821 12.8571 2.92701 12.8571ZM4.28103 9.35357L11.5674 2.0692L13.04 3.54174L5.75357 10.8261L3.96763 11.1415L4.28103 9.35357ZM15.4286 14.5446H0.642857C0.287277 14.5446 0 14.8319 0 15.1875V15.9107C0 15.9991 0.0723214 16.0714 0.160714 16.0714H15.9107C15.9991 16.0714 16.0714 15.9991 16.0714 15.9107V15.1875C16.0714 14.8319 15.7842 14.5446 15.4286 14.5446Z" fill="white"/>
              </svg>
            </Button>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{item.price.toLocaleString('ru-RU')} ₽</p>
            {item.createdAt && (
              <p className="text-sm text-muted-foreground mt-1">
                Опубликовано: {formatDate(item.createdAt)}
              </p>
            )}
            {item.updatedAt && (
              <p className="text-sm text-muted-foreground">
                Отредактировано: {formatDate(item.updatedAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-border mx-8 lg:mx-16" />

      <div className="px-8 lg:px-16 py-8">
        <div className="flex flex-col md:flex-row gap-6" style={{ maxWidth: '900px' }}>
          <div className="shrink-0" style={{ width: '480px' }}>
            <div className="bg-muted border border-border rounded-xl flex items-center justify-center overflow-hidden" style={{ height: '360px' }}>
              {item.image ? (
                <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <Package className="h-16 w-16 text-muted-foreground/40" />
              )}
            </div>
          </div>

          <div className="flex-1 space-y-6 min-w-0">
            {missingFields.length > 0 && (
              <div className="rounded-xl p-4 shadow-sm bg-warning/10 border border-warning/20">
                <div className="flex items-center gap-2 font-semibold text-sm mb-2">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full text-white text-xs font-bold bg-warning">!</span>
                  Требуются доработки
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  У объявления не заполнены поля:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                  {missingFields.map(f => <li key={f}>{f}</li>)}
                </ul>
              </div>
            )}

            {paramLabels.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-3">Характеристики</h2>
                <div className="space-y-2">
                  {paramLabels.map(p => (
                    <div key={p.label} className="flex gap-2 text-sm">
                      <span className="text-muted-foreground min-w-[120px]">{p.label}</span>
                      <span className="font-medium">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8" style={{ maxWidth: '480px' }}>
          <h2 className="text-lg font-bold mb-2">Описание</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {item.description || 'Отсутствует'}
          </p>
        </div>
      </div>
    </div>
  );
}
