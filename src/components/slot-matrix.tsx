'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

export type SlotInput = { name: string; days: number[] };

type RowState = boolean[]; // 7 giorni, indice 0 = lunedì (ISO 1)

function daysToRow(days: number[]): RowState {
  const row = Array(7).fill(false);
  for (const d of days) if (d >= 1 && d <= 7) row[d - 1] = true;
  return row;
}

function rowToDays(row: RowState): number[] {
  const days: number[] = [];
  row.forEach((on, i) => on && days.push(i + 1));
  return days;
}

type Preset = 'dinners' | 'dinnersWeekend' | 'all';

function presetRows(preset: Preset): { lunch: RowState; dinner: RowState } {
  const none = Array(7).fill(false);
  const all = Array(7).fill(true);
  const weekend = [false, false, false, false, false, true, true];
  switch (preset) {
    case 'dinners':
      return { lunch: [...none], dinner: [...all] };
    case 'dinnersWeekend':
      return { lunch: weekend, dinner: [...all] };
    case 'all':
      return { lunch: [...all], dinner: [...all] };
  }
}

// Editor della matrice slot×giorni (Pranzo/Cena × 7). Emette gli slot con giorni ISO.
export function SlotMatrix({
  initial,
  onChange,
}: {
  initial: SlotInput[];
  onChange: (slots: SlotInput[]) => void;
}) {
  const t = useTranslations('wizard');
  const cal = useTranslations('cal');
  const lunchLabel = t('slotLunch');
  const dinnerLabel = t('slotDinner');

  const init = useMemo(() => {
    const lunch = initial.find((s) => s.name === lunchLabel);
    const dinner = initial.find((s) => s.name === dinnerLabel);
    return {
      lunch: daysToRow(lunch?.days ?? []),
      dinner: daysToRow(dinner?.days ?? [1, 2, 3, 4, 5, 6, 7]),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [lunch, setLunch] = useState<RowState>(init.lunch);
  const [dinner, setDinner] = useState<RowState>(init.dinner);

  function emit(nextLunch: RowState, nextDinner: RowState) {
    onChange([
      { name: lunchLabel, days: rowToDays(nextLunch) },
      { name: dinnerLabel, days: rowToDays(nextDinner) },
    ]);
  }

  function toggle(row: 'lunch' | 'dinner', i: number) {
    if (row === 'lunch') {
      const next = lunch.map((v, idx) => (idx === i ? !v : v));
      setLunch(next);
      emit(next, dinner);
    } else {
      const next = dinner.map((v, idx) => (idx === i ? !v : v));
      setDinner(next);
      emit(lunch, next);
    }
  }

  function applyPreset(p: Preset) {
    const { lunch: l, dinner: d } = presetRows(p);
    setLunch(l);
    setDinner(d);
    emit(l, d);
  }

  const shortDays = cal.raw('short') as string[];

  const presets: { key: Preset; label: string }[] = [
    { key: 'dinners', label: t('presetDinners') },
    { key: 'dinnersWeekend', label: t('presetDinnersWeekend') },
    { key: 'all', label: t('presetAll') },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => applyPreset(p.key)}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-[0.8rem] font-semibold hover:bg-surface2"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-3.5">
        <table className="w-full border-collapse text-[0.82rem]">
          <thead>
            <tr>
              <th />
              {shortDays.map((d, i) => (
                <th key={i} className="p-1 font-semibold text-muted">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['lunch', 'dinner'] as const).map((rowKey) => {
              const row = rowKey === 'lunch' ? lunch : dinner;
              const label = rowKey === 'lunch' ? lunchLabel : dinnerLabel;
              return (
                <tr key={rowKey}>
                  <th className="p-1 text-left font-semibold">{label}</th>
                  {row.map((on, i) => (
                    <td key={i} className="p-1 text-center">
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={`${label} ${shortDays[i]}`}
                        onClick={() => toggle(rowKey, i)}
                        className={cn(
                          'inline-flex h-7 w-7 items-center justify-center rounded-lg border-2 text-[0.7rem] font-bold',
                          on
                            ? 'border-accent bg-accent text-on-accent'
                            : 'border-line bg-surface text-transparent',
                        )}
                      >
                        ✓
                      </button>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
