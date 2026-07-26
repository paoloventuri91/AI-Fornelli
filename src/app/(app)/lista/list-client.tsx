'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/field';
import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/cn';
import { UNITS, type Unit } from '@/server/db/schema';
import {
  addItemAction,
  regenerateShoppingAction,
  removeItemAction,
  toggleItemAction,
} from '@/server/shopping-actions';

type Item = {
  id: number;
  name: string;
  quantity: number | null;
  unit: Unit;
  checked: boolean;
  source: 'auto' | 'manual';
};

export function ListClient({
  weekStart,
  items,
}: {
  weekStart: string;
  items: Item[];
}) {
  const t = useTranslations('list');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState<Unit>('pz');

  const done = items.filter((i) => i.checked).length;
  const total = items.length;

  function toggle(item: Item) {
    start(() => toggleItemAction(item.id, !item.checked));
  }
  function remove(item: Item) {
    start(() => removeItemAction(item.id));
  }
  function regenerate() {
    start(async () => {
      await regenerateShoppingAction(weekStart);
      router.refresh();
    });
  }
  function add() {
    if (!name.trim()) return;
    const quantity = unit === 'qb' || qty === '' ? null : Number(qty);
    start(async () => {
      await addItemAction(weekStart, { name: name.trim(), quantity, unit });
      setName('');
      setQty('');
      router.refresh();
    });
  }

  return (
    <div className="p-4 md:mx-auto md:max-w-2xl md:p-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-[1.45rem] md:text-[1.7rem]">
          {t('title')}
        </h2>
        <Button onClick={regenerate} disabled={pending} className="text-[0.85rem]">
          {t('regenerate')}
        </Button>
      </div>

      {total > 0 && (
        <>
          <p className="mb-1.5 px-0.5 text-[0.82rem] text-muted">
            {t('progress', { done, total })} · {t('pantryNote')}
          </p>
          <div className="mb-3.5 h-1.5 overflow-hidden rounded bg-surface2">
            <div
              className="h-full bg-good transition-all"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </>
      )}

      <Card>
        {items.length === 0 ? (
          <p className="text-[0.9rem] text-muted">{t('empty')}</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-3 border-b border-line py-2.5 last:border-b-0',
                item.checked && 'opacity-60',
              )}
            >
              <button
                type="button"
                onClick={() => toggle(item)}
                aria-pressed={item.checked}
                aria-label={item.name}
                className={cn(
                  'flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md border-2 text-[0.8rem]',
                  item.checked
                    ? 'border-good bg-good text-white'
                    : 'border-line bg-surface text-transparent',
                )}
              >
                ✓
              </button>
              <span
                className={cn(
                  'flex-1',
                  item.checked && 'text-muted line-through',
                )}
              >
                {item.name}
                {item.source === 'manual' && (
                  <Chip tone="neutral" className="ml-2">
                    {t('manual')}
                  </Chip>
                )}
              </span>
              <span className="tabular-nums text-[0.9rem] text-muted">
                {item.unit === 'qb'
                  ? 'qb'
                  : `${item.quantity ?? ''} ${item.unit}`}
              </span>
              <button
                type="button"
                onClick={() => remove(item)}
                className="px-1 text-[1.1rem] text-muted"
                aria-label="×"
              >
                ×
              </button>
            </div>
          ))
        )}
      </Card>

      <div className="mt-3 flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('addPlaceholder')}
          className="flex-1"
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <Input
          type="number"
          min={0}
          step="any"
          value={unit === 'qb' ? '' : qty}
          onChange={(e) => setQty(e.target.value)}
          disabled={unit === 'qb'}
          className="w-20"
          aria-label="Q.tà"
        />
        <Select
          value={unit}
          onChange={(e) => setUnit(e.target.value as Unit)}
          className="w-24"
          aria-label="Unità"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </Select>
        <Button variant="primary" onClick={add} disabled={pending}>
          +
        </Button>
      </div>
    </div>
  );
}
