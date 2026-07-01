import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import {
  extractAttributes,
  extractImages,
  extractPrices,
  extractProduct,
  extractProductId,
  extractTitle,
} from '../src/content/extractor';

const fixturePath = path.join(__dirname, 'fixtures', 'product.html');
const html = fs.readFileSync(fixturePath, 'utf-8');
const sourceUrl = 'https://www.ozon.ru/product/shipovki-legkoatleticheskie-4584339838/';

function withDom(run: (doc: Document) => void) {
  const dom = new JSDOM(html, { url: sourceUrl });
  run(dom.window.document);
}

describe('extractProductId', () => {
  it('extracts id from slug url', () => {
    expect(extractProductId(sourceUrl)).toBe('4584339838');
  });
});

describe('extractor on fixture', () => {
  it('extracts title and prices', () => {
    withDom((doc) => {
      expect(extractTitle(doc)).toBe('Шиповки легкоатлетические');
      expect(extractPrices(doc)).toEqual({ price: 2017, original: 4212 });
    });
  });

  it('extracts attributes and images', () => {
    withDom((doc) => {
      const attrs = extractAttributes(doc);
      expect(attrs['Страна-изготовитель']).toBe('Китай');
      const images = extractImages(doc);
      expect(images.length).toBeGreaterThanOrEqual(2);
      expect(images[0].url).toContain('/c1200/');
    });
  });

  it('builds full product payload', () => {
    withDom((doc) => {
      const product = extractProduct(doc, sourceUrl);
      expect(product.ozon_product_id).toBe('4584339838');
      expect(product.price_rub).toBe(2017);
      expect(product.original_price_rub).toBe(4212);
      expect(product.discount_percent).toBe(52.1);
      expect(product.category_path).toContain('Спорт и отдых');
      expect(product.in_stock).toBe(true);
      expect(product.variants.length).toBeGreaterThan(0);
    });
  });
});
