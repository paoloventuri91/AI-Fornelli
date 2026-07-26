import type { Unit } from '@/server/db/schema';

export type RawIngredient = {
  name: string;
  quantity: number | null;
  unit: Unit;
};

export type AggregatedItem = {
  name: string; // nome di visualizzazione (prima occorrenza)
  nameNormalized: string;
  quantity: number | null; // null solo per qb
  unit: Unit;
};

// Normalizza il nome per il raggruppamento: minuscolo, senza accenti, spazi compattati.
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

type Family = 'mass' | 'volume' | 'count' | 'spoon' | 'qb';

function familyOf(unit: Unit): Family {
  switch (unit) {
    case 'g':
    case 'kg':
      return 'mass';
    case 'ml':
    case 'l':
      return 'volume';
    case 'pz':
      return 'count';
    case 'cucchiai':
      return 'spoon';
    case 'qb':
      return 'qb';
  }
}

// Converte una quantità nell'unità base della sua famiglia (g, ml, pz, cucchiai).
function toBase(quantity: number, unit: Unit): number {
  if (unit === 'kg' || unit === 'l') return quantity * 1000;
  return quantity;
}

// Sceglie un'unità di visualizzazione leggibile per una quantità in unità base.
function fromBase(base: number, family: Family): { quantity: number; unit: Unit } {
  switch (family) {
    case 'mass':
      return base >= 1000
        ? { quantity: round(base / 1000), unit: 'kg' }
        : { quantity: round(base), unit: 'g' };
    case 'volume':
      return base >= 1000
        ? { quantity: round(base / 1000), unit: 'l' }
        : { quantity: round(base), unit: 'ml' };
    case 'count':
      return { quantity: round(base), unit: 'pz' };
    case 'spoon':
      return { quantity: round(base), unit: 'cucchiai' };
    case 'qb':
      return { quantity: 0, unit: 'qb' };
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Aggrega ingredienti da testo libero:
 * - raggruppa per nome normalizzato;
 * - somma solo all'interno della stessa famiglia di unità (massa/volume/pz/cucchiai);
 * - famiglie diverse per lo stesso nome → righe separate (errori economici, lista spuntabile);
 * - "qb" non ha quantità e viene soppresso se lo stesso nome ha una quantità numerica.
 */
export type AggregateOptions = {
  // Scorte da sottrarre (es. dispensa): sottratte per nome+famiglia; una copertura
  // completa rimuove la voce, una parziale ne riduce la quantità. Non tocca le voci "qb".
  subtract?: RawIngredient[];
};

export function aggregateIngredients(
  items: RawIngredient[],
  options: AggregateOptions = {},
): AggregatedItem[] {
  // Raggruppa per nome normalizzato, poi per famiglia.
  type Group = {
    displayName: string;
    families: Map<Family, { base: number; hasNumeric: boolean; subtract: number }>;
  };
  const byName = new Map<string, Group>();

  function ensure(name: string): Group {
    const norm = normalizeName(name);
    let group = byName.get(norm);
    if (!group) {
      group = { displayName: name.trim(), families: new Map() };
      byName.set(norm, group);
    }
    return group;
  }

  for (const raw of items) {
    const name = raw.name.trim();
    if (!name) continue;
    const group = ensure(name);
    const family = familyOf(raw.unit);
    const entry = group.families.get(family) ?? {
      base: 0,
      hasNumeric: false,
      subtract: 0,
    };
    if (family !== 'qb' && raw.quantity != null && raw.quantity > 0) {
      entry.base += toBase(raw.quantity, raw.unit);
      entry.hasNumeric = true;
    }
    group.families.set(family, entry);
  }

  for (const raw of options.subtract ?? []) {
    const name = raw.name.trim();
    if (!name) continue;
    const family = familyOf(raw.unit);
    if (family === 'qb') continue;
    if (raw.quantity == null || !(raw.quantity > 0)) continue;
    const norm = normalizeName(name);
    const group = byName.get(norm);
    if (!group) continue; // niente da sottrarre se non è richiesto
    const entry = group.families.get(family);
    if (!entry) continue;
    entry.subtract += toBase(raw.quantity, raw.unit);
  }

  const out: AggregatedItem[] = [];
  for (const [norm, group] of byName) {
    const numericFamilies = [...group.families.entries()].filter(
      ([fam, e]) => fam !== 'qb' && e.hasNumeric,
    );

    if (numericFamilies.length === 0) {
      // Solo qb (o nessuna quantità): una riga "qb".
      out.push({
        name: group.displayName,
        nameNormalized: norm,
        quantity: null,
        unit: 'qb',
      });
      continue;
    }

    // Una riga per ogni famiglia numerica; la qb viene soppressa.
    for (const [family, e] of numericFamilies) {
      const net = e.base - e.subtract;
      if (net <= 0) continue; // coperto dalla dispensa
      const { quantity, unit } = fromBase(net, family);
      out.push({
        name: group.displayName,
        nameNormalized: norm,
        quantity,
        unit,
      });
    }
  }

  out.sort((a, b) => a.nameNormalized.localeCompare(b.nameNormalized));
  return out;
}
