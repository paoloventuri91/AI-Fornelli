'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { UNITS, type Unit } from '@/server/db/schema';

export type IngredientRow = { name: string; quantity: string; unit: Unit };
export type DishFormValue = {
  title: string;
  servingsBase: number;
  steps: string[];
  ingredients: { name: string; quantity: number | null; unit: Unit }[];
};

export type DishFormInitial = {
  title?: string;
  servingsBase?: number;
  steps?: string[];
  ingredients?: { name: string; quantity: number | null; unit: Unit }[];
};

function toRows(
  ings?: { name: string; quantity: number | null; unit: Unit }[],
): IngredientRow[] {
  if (!ings || ings.length === 0)
    return [{ name: '', quantity: '', unit: 'g' }];
  return ings.map((i) => ({
    name: i.name,
    quantity: i.quantity == null ? '' : String(i.quantity),
    unit: i.unit,
  }));
}

export function DishForm({
  initial,
  onSubmit,
  onCancel,
  busy,
}: {
  initial?: DishFormInitial;
  onSubmit: (value: DishFormValue) => void;
  onCancel?: () => void;
  busy?: boolean;
}) {
  const t = useTranslations('dish');
  const tc = useTranslations('common');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [servings, setServings] = useState(initial?.servingsBase ?? 2);
  const [rows, setRows] = useState<IngredientRow[]>(toRows(initial?.ingredients));
  const [stepsText, setStepsText] = useState((initial?.steps ?? []).join('\n'));

  function setRow(i: number, patch: Partial<IngredientRow>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function addRow() {
    setRows((r) => [...r, { name: '', quantity: '', unit: 'g' }]);
  }
  function removeRow(i: number) {
    setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r));
  }

  function submit() {
    if (!title.trim()) return;
    const ingredients = rows
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        unit: r.unit,
        quantity:
          r.unit === 'qb' || r.quantity === ''
            ? null
            : Number(r.quantity),
      }))
      // scarta righe non-qb senza quantità valida (il servizio le rifiuterebbe)
      .filter((r) => r.unit === 'qb' || (r.quantity != null && r.quantity > 0));
    const steps = stepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    onSubmit({ title: title.trim(), servingsBase: servings, steps, ingredients });
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label={t('titleLabel')} htmlFor="d-title">
        <Input
          id="d-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('titlePlaceholder')}
          autoFocus
        />
      </Field>
      <Field label={t('servings')} htmlFor="d-serv">
        <Input
          id="d-serv"
          type="number"
          min={1}
          max={50}
          value={servings}
          onChange={(e) => setServings(Math.max(1, Number(e.target.value) || 1))}
          className="w-24"
        />
      </Field>

      <div>
        <p className="mb-1.5 text-[0.78rem] font-semibold uppercase tracking-[0.04em] text-muted">
          {t('ingredients')}
        </p>
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={row.name}
                onChange={(e) => setRow(i, { name: e.target.value })}
                placeholder={t('ingredientName')}
                className="grow"
              />
              <Input
                type="number"
                min={0}
                step="any"
                value={row.unit === 'qb' ? '' : row.quantity}
                onChange={(e) => setRow(i, { quantity: e.target.value })}
                placeholder={t('quantity')}
                disabled={row.unit === 'qb'}
                className="w-20"
                aria-label={t('quantity')}
              />
              <Select
                value={row.unit}
                onChange={(e) => setRow(i, { unit: e.target.value as Unit })}
                className="w-24"
                aria-label={t('unit')}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="px-1 text-[1.1rem] text-muted"
                aria-label={tc('delete')}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="mt-2 text-[0.85rem] font-semibold text-accent"
        >
          + {t('addIngredient')}
        </button>
      </div>

      <Field label={t('steps')} htmlFor="d-steps">
        <Textarea
          id="d-steps"
          rows={5}
          value={stepsText}
          onChange={(e) => setStepsText(e.target.value)}
          placeholder={t('stepsHint')}
        />
      </Field>

      <div className="flex gap-2.5">
        {onCancel && (
          <Button type="button" onClick={onCancel} disabled={busy}>
            {tc('cancel')}
          </Button>
        )}
        <Button
          type="button"
          variant="primary"
          className="grow"
          onClick={submit}
          disabled={busy || !title.trim()}
        >
          {t('save')}
        </Button>
      </div>
    </div>
  );
}
