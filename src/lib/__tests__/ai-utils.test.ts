import { describe, it, expect } from 'vitest';
import { cleanPriceResponse, extractRecommendedPrice } from '../ai-utils';

describe('cleanPriceResponse', () => {
  it('strips markdown headers', () => {
    const input = '## Заголовок\nТекст';
    expect(cleanPriceResponse(input)).toBe('Заголовок\nТекст');
  });

  it('strips bold and italic markers', () => {
    expect(cleanPriceResponse('**жирный** и *курсив*')).toBe('жирный и курсив');
  });

  it('strips inline code', () => {
    expect(cleanPriceResponse('цена `15000` руб')).toBe('цена  руб');
  });

  it('replaces markdown list markers with bullet', () => {
    const input = '- первый\n- второй';
    expect(cleanPriceResponse(input)).toBe('• первый\n• второй');
  });

  it('limits output to 5 lines', () => {
    const input = Array.from({ length: 10 }, (_, i) => `строка ${i + 1}`).join('\n');
    const result = cleanPriceResponse(input);
    expect(result.split('\n')).toHaveLength(5);
  });

  it('removes horizontal rules', () => {
    expect(cleanPriceResponse('до\n---\nпосле')).toBe('до\nпосле');
  });

  it('collapses excessive blank lines', () => {
    expect(cleanPriceResponse('a\n\n\n\nb')).toBe('a\nb');
  });
});

describe('extractRecommendedPrice', () => {
  it('extracts price from line with "средняя"', () => {
    expect(extractRecommendedPrice('Средняя цена на MacBook Pro: 120 000 ₽')).toBe(120000);
  });

  it('extracts price from line with "рекомендуемая"', () => {
    expect(extractRecommendedPrice('Рекомендуемая цена: 55 000 рублей')).toBe(55000);
  });

  it('extracts price from line with "оптимальная"', () => {
    expect(extractRecommendedPrice('Оптимальная цена: 75 000 ₽')).toBe(75000);
  });

  it('falls back to currency pattern when no keyword line', () => {
    expect(extractRecommendedPrice('Можно продать за 30 000 руб')).toBe(30000);
  });

  it('falls back to first large number', () => {
    expect(extractRecommendedPrice('Диапазон от 15 000 до 25 000')).toBe(15000);
  });

  it('returns null for text without numbers >= 1000', () => {
    expect(extractRecommendedPrice('Цена 50')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractRecommendedPrice('')).toBeNull();
  });

  it('ignores small numbers in keyword lines', () => {
    const text = 'Средняя цена на iPhone 17: 95 000 ₽';
    expect(extractRecommendedPrice(text)).toBe(95000);
  });

  it('handles multiline with keyword match', () => {
    const text = [
      '• от 80 000 до 100 000 — базовый',
      'Средняя цена: 110 000 ₽',
      '• от 100 000 до 130 000 — средний',
    ].join('\n');
    expect(extractRecommendedPrice(text)).toBe(110000);
  });

  it('handles price with ₽ symbol', () => {
    expect(extractRecommendedPrice('Стоимость 45 000₽')).toBe(45000);
  });
});
