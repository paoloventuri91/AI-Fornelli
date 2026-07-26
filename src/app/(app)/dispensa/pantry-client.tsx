'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/field';
import { Chip } from '@/components/ui/chip';
import { UNITS, type Unit } from '@/server/db/schema';
import type { ExpiryStatus } from '@/server/services/pantry';
import {
  addPantryItemAction,
  removePantryItemAction,
} from '@/server/pantry-actions';

type Item = {
  id: number;
  name: string;
  quantity: number | null;
  unit: Unit;
  expiresOn: string | null;
  status: ExpiryStatus;
};

function ExpiryChip({ item }: { item: Item }) {
  const t = useTranslations('pantry');
  if (item.status === 'none') return null;
  if (item.status === 'expired')
    return <Chip tone="bad">{t('expired')}</Chip>;
  if (item.status === 'today')
    return <Chip tone="warn">{t('expiresToday')}</Chip>;
  const tone = item.status === 'soon' ? 'warn' : 'neutral';
  return <Chip tone={tone}>{t('expiresOn', { date: item.expiresOn! })}</Chip>;
}

export function PantryClient({ items }: { items: Item[] }) {
  const t = useTranslations('pantry');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState<Unit>('g');
  const [expiry, setExpiry] = useState('');
  const [adding, setAdding] = useState(false);

  function add() {
    if (!name.trim()) return;
    const quantity = unit === 'qb' || qty === '' ? null : Number(qty);
    start(async () => {
      await addPantryItemAction({
        name: name.trim(),
        quantity,
        unit,
        expiresOn: expiry || null,
      });
      setName('');
      setQty('');
      setExpiry('');
      setAdding(false);
      router.refresh();
    });
  }
  function remove(id: number) {
    start(async () => {
      await removePantryItemAction(id);
      router.refresh();
    });
  }

  return (
    <div className="p-4 md:mx-auto md:max-w-2xl md:p-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[1.45rem] md:text-[1.7rem]">
          {t('title')}
        </h2>
        <Button onClick={() => setAdding((a) => !a)} className="text-[0.85rem]">
          + {t('add')}
        </Button>
      </div>

      {adding && (
        <Card className="mb-3 flex flex-col gap-2.5">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('name')}
            autoFocus
          />
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              step="any"
              value={unit === 'qb' ? '' : qty}
              onChange={(e) => setQty(e.target.value)}
              disabled={unit === 'qb'}
              placeholder={t('quantity')}
              className="w-24"
            />
            <Select
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              className="w-28"
              aria-label={t('unit')}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="flex-1"
              aria-label={t('expiry')}
            />
          </div>
          <Button variant="primary" onClick={add} disabled={pending || !name.trim()}>
            {t('add')}
          </Button>
        </Card>
      )}

      <Card>
        {items.length === 0 ? (
          <p className="text-[0.9rem] text-muted">{t('empty')}</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2.5 border-b border-line py-2.5 last:border-b-0"
            >
              <span className="flex-1">
                {item.name}{' '}
                <span className="tabular-nums text-muted">
                  {item.unit === 'qb'
                    ? 'qb'
                    : `${item.quantity ?? ''} ${item.unit}`}
                </span>
              </span>
              <ExpiryChip item={item} />
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="px-1 text-[1.1rem] text-muted"
                aria-label="×"
              >
                ×
              </button>
            </div>
          ))
        )}
      </Card>

      <p className="mt-2.5 px-0.5 text-[0.82rem] text-muted">{t('aiNote')}</p>
    </div>
  );
}
