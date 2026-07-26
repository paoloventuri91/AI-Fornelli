import { describe, expect, it } from 'vitest';
import { buildPlanContext } from '../context';

const BASE = {
  profiles: [
    { name: 'Paolo', dietaryConstraints: '', preferences: 'ama la pasta', portionFactor: 1 },
    { name: 'Sofia', dietaryConstraints: 'no piccante', preferences: '', portionFactor: 0.5 },
  ],
  slotNames: ['Cena'],
  cells: [
    { date: '2026-07-20', slotName: 'Cena' },
    { date: '2026-07-21', slotName: 'Cena' },
  ],
  historyTitles: ['Lasagne', 'Risotto ai funghi'],
  freeConstraints: 'martedì cena fuori',
};

describe('buildPlanContext', () => {
  it('includes members, constraints, preferences and portions', () => {
    const ctx = buildPlanContext({ language: 'it', ...BASE });
    expect(ctx).toContain('Paolo');
    expect(ctx).toContain('ama la pasta');
    expect(ctx).toContain('no piccante');
    expect(ctx).toContain('0.5×');
  });

  it('lists the cells to fill and the recent history for anti-repetition', () => {
    const ctx = buildPlanContext({ language: 'it', ...BASE });
    expect(ctx).toContain('2026-07-20 · Cena');
    expect(ctx).toContain('2026-07-21 · Cena');
    expect(ctx).toContain('Lasagne');
    expect(ctx).toContain('martedì cena fuori');
  });

  it('switches language for the fixed labels', () => {
    const it = buildPlanContext({ language: 'it', ...BASE });
    const en = buildPlanContext({ language: 'en', ...BASE });
    expect(it).toContain('Membri della famiglia');
    expect(en).toContain('Family members');
  });

  it('is a stable snapshot for a known input', () => {
    expect(buildPlanContext({ language: 'it', ...BASE })).toMatchSnapshot();
  });
});
