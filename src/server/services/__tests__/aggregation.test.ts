import { describe, expect, it } from 'vitest';
import {
  aggregateIngredients,
  normalizeName,
  type RawIngredient,
} from '../aggregation';

const g = (name: string, quantity: number | null, unit: RawIngredient['unit']) => ({
  name,
  quantity,
  unit,
});

describe('normalizeName', () => {
  it('lowercases, trims, collapses spaces and strips accents', () => {
    expect(normalizeName('  Cime  di  Rapa ')).toBe('cime di rapa');
    expect(normalizeName('Purè')).toBe('pure');
  });
});

describe('aggregateIngredients', () => {
  it('sums quantities of the same name and unit', () => {
    const out = aggregateIngredients([
      g('Farina', 200, 'g'),
      g('Farina', 300, 'g'),
    ]);
    expect(out).toEqual([
      { name: 'Farina', nameNormalized: 'farina', quantity: 500, unit: 'g' },
    ]);
  });

  it('merges within the same family across g/kg and promotes to kg when >= 1000 g', () => {
    const out = aggregateIngredients([g('Patate', 800, 'g'), g('Patate', 0.4, 'kg')]);
    expect(out).toEqual([
      { name: 'Patate', nameNormalized: 'patate', quantity: 1.2, unit: 'kg' },
    ]);
  });

  it('merges volume ml/l and keeps ml under 1000', () => {
    const out = aggregateIngredients([g('Latte', 200, 'ml'), g('Latte', 0.3, 'l')]);
    expect(out).toEqual([
      { name: 'Latte', nameNormalized: 'latte', quantity: 500, unit: 'ml' },
    ]);
  });

  it('normalizes names before grouping (accents, case, spaces)', () => {
    const out = aggregateIngredients([g('Cime di rapa', 500, 'g'), g('cime  di  RAPA', 500, 'g')]);
    expect(out).toHaveLength(1);
    expect(out[0].quantity).toBe(1);
    expect(out[0].unit).toBe('kg');
  });

  it('keeps different unit families of the same name as separate rows', () => {
    const out = aggregateIngredients([g('Aglio', 2, 'pz'), g('Aglio', 10, 'g')]);
    expect(out).toHaveLength(2);
    const units = out.map((o) => o.unit).sort();
    expect(units).toEqual(['g', 'pz']);
  });

  it('collapses qb entries into a single quantity-less row', () => {
    const out = aggregateIngredients([g('Sale', null, 'qb'), g('Sale', null, 'qb')]);
    expect(out).toEqual([
      { name: 'Sale', nameNormalized: 'sale', quantity: null, unit: 'qb' },
    ]);
  });

  it('suppresses qb when the same name also has a numeric quantity', () => {
    const out = aggregateIngredients([g('Olio', 3, 'cucchiai'), g('Olio', null, 'qb')]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ unit: 'cucchiai', quantity: 3 });
  });

  it('ignores non-positive or missing quantities for numeric units', () => {
    const out = aggregateIngredients([g('Zucchero', 0, 'g'), g('Zucchero', null, 'g')]);
    // nessuna quantità valida → trattato come privo di quantità → riga qb
    expect(out).toEqual([
      { name: 'Zucchero', nameNormalized: 'zucchero', quantity: null, unit: 'qb' },
    ]);
  });

  it('sums cucchiai together and counts (pz) together', () => {
    const out = aggregateIngredients([
      g('Uova', 2, 'pz'),
      g('Uova', 4, 'pz'),
      g('Olio', 1, 'cucchiai'),
      g('Olio', 2, 'cucchiai'),
    ]);
    const uova = out.find((o) => o.nameNormalized === 'uova')!;
    const olio = out.find((o) => o.nameNormalized === 'olio')!;
    expect(uova).toMatchObject({ quantity: 6, unit: 'pz' });
    expect(olio).toMatchObject({ quantity: 3, unit: 'cucchiai' });
  });

  it('keeps the first display name and sorts output by normalized name', () => {
    const out = aggregateIngredients([
      g('Zenzero', 10, 'g'),
      g('Basilico', null, 'qb'),
      g('ZENZERO', 5, 'g'),
    ]);
    expect(out.map((o) => o.nameNormalized)).toEqual(['basilico', 'zenzero']);
    expect(out.find((o) => o.nameNormalized === 'zenzero')!.name).toBe('Zenzero');
  });

  it('handles an empty input', () => {
    expect(aggregateIngredients([])).toEqual([]);
  });

  it('drops entries with blank names', () => {
    expect(aggregateIngredients([g('   ', 5, 'g')])).toEqual([]);
  });
});
