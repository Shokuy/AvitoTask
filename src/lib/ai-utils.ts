export function cleanPriceResponse(text: string): string {
  let cleaned = text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*{2,3}(.*?)\*{2,3}/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/---+/g, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n')
    .trim();

  const lines = cleaned.split('\n').filter(l => l.trim());
  return lines.slice(0, 5).join('\n');
}

export function extractRecommendedPrice(text: string): number | null {
  const lines = text.split('\n');
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('средн') || lower.includes('рекоменд') || lower.includes('оптимальн') || lower.includes('справедлив')) {
      const numbers = line.match(/\d[\d\s]*\d/g);
      if (numbers) {
        for (const numStr of numbers) {
          const num = Number(numStr.replace(/\s/g, ''));
          if (num >= 1000) return num;
        }
      }
    }
  }
  const currencyMatch = text.match(/(\d[\d\s]*\d)\s*(?:руб|₽|рублей)/i);
  if (currencyMatch) {
    const num = Number(currencyMatch[1].replace(/\s/g, ''));
    if (num >= 1000) return num;
  }
  const allNumbers = (text.match(/\d[\d\s]*\d/g) || [])
    .map(m => Number(m.replace(/\s/g, '')))
    .filter(n => n >= 1000);
  return allNumbers[0] ?? null;
}
