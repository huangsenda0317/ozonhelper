export function parsePrice(text: string | null | undefined): number {
  if (!text) return 0;
  const cleaned = text.replace(/[^\d.,]/g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

export function parseRating(text: string | null | undefined): number | undefined {
  if (!text) return undefined;
  const match = text.replace(',', '.').match(/\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const value = parseFloat(match[0]);
  return value > 0 && value <= 5 ? value : undefined;
}

export function parseCount(text: string | null | undefined): number | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/[^\d]/g, '');
  if (!cleaned) return undefined;
  const value = parseInt(cleaned, 10);
  return Number.isFinite(value) ? value : undefined;
}

export function calcDiscountPercent(price: number, original?: number): number | undefined {
  if (!original || original <= 0 || price >= original) return undefined;
  return Math.round((1 - price / original) * 1000) / 10;
}

export function normalizeImageUrl(url: string): string {
  return url
    .replace(/\/wc\d+\//, '/c1200/')
    .replace(/\/c600\//, '/c1200/')
    .replace(/\/wc1000\//, '/c1200/');
}

export function isOzonProductUrl(url: string): boolean {
  return /^https:\/\/www\.ozon\.ru\/product\//.test(url);
}
