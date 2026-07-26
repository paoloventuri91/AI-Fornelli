'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { Chip } from '@/components/ui/chip';
import { DishForm, type DishFormValue } from '@/components/dish-form';
import { cn } from '@/lib/cn';
import type { MealView } from '@/server/services/planning';
import {
  assignNewDishAction,
  clearPlannedDishAction,
  consumeNewDishAction,
  editDishAction,
  saveConstraintsAction,
  setConsumedAction,
  setEatingOutAction,
} from '@/server/planning-actions';

type Props = {
  weekStart: string;
  prevWeek: string;
  nextWeek: string;
  weekLabel: string;
  today: string;
  constraintsText: string;
  meals: MealView[];
};

type SheetMode = 'actions' | 'editPlan' | 'consumed' | 'consumedOther';

function dayLabel(date: string, locale: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric' });
}

export function PlanClient({
  weekStart,
  prevWeek,
  nextWeek,
  weekLabel,
  today,
  constraintsText,
  meals,
}: Props) {
  const t = useTranslations('plan');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [pending, start] = useTransition();

  const [constraints, setConstraints] = useState(constraintsText);
  const [openMealId, setOpenMealId] = useState<number | null>(null);
  const [mode, setMode] = useState<SheetMode>('actions');

  const openMeal = meals.find((m) => m.id === openMealId) ?? null;

  // Raggruppa i pasti per giorno mantenendo l'ordine.
  const days: { date: string; meals: MealView[] }[] = [];
  for (const m of meals) {
    let day = days.find((d) => d.date === m.date);
    if (!day) {
      day = { date: m.date, meals: [] };
      days.push(day);
    }
    day.meals.push(m);
  }

  function openSheet(id: number) {
    setOpenMealId(id);
    setMode('actions');
  }
  function closeSheet() {
    setOpenMealId(null);
  }

  function saveConstraints() {
    if (constraints !== constraintsText)
      start(() => saveConstraintsAction(weekStart, constraints));
  }
  function toggleEatingOut(m: MealView) {
    start(async () => {
      await setEatingOutAction(m.id, !m.isEatingOut);
      closeSheet();
    });
  }
  function savePlanDish(m: MealView, value: DishFormValue) {
    start(async () => {
      if (m.plannedDish) await editDishAction(m.plannedDish.id, value);
      else await assignNewDishAction(m.id, value);
      closeSheet();
    });
  }
  function consumeAsPlanned(m: MealView) {
    if (!m.plannedDish) return;
    start(async () => {
      await setConsumedAction(m.id, m.plannedDish!.id);
      closeSheet();
    });
  }
  function consumeOther(m: MealView, value: DishFormValue) {
    start(async () => {
      await consumeNewDishAction(m.id, value);
      closeSheet();
    });
  }
  function clearCell(m: MealView) {
    start(async () => {
      await clearPlannedDishAction(m.id);
      await setConsumedAction(m.id, null);
      await setEatingOutAction(m.id, false);
      closeSheet();
    });
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[1.45rem] md:text-[1.7rem]">
          {t('title')}
        </h2>
      </div>

      {/* Navigatore settimana */}
      <div className="mb-3 flex items-center justify-center gap-2">
        <Link
          href={`/?w=${prevWeek}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line"
          aria-label="←"
        >
          ‹
        </Link>
        <span className="font-bold">{weekLabel}</span>
        <Link
          href={`/?w=${nextWeek}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line"
          aria-label="→"
        >
          ›
        </Link>
      </div>

      {/* Vincoli settimana */}
      <Card className="mb-4">
        <Field label={t('constraintsLabel')} htmlFor="constraints">
          <Input
            id="constraints"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            onBlur={saveConstraints}
            placeholder={t('constraintsPlaceholder')}
          />
        </Field>
      </Card>

      {/* Griglia giorni × slot */}
      <div className="md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3">
        {days.map((day) => {
          const isToday = day.date === today;
          const isPast = day.date < today;
          return (
            <div key={day.date} className="mb-3.5">
              <div className="mb-1.5 flex items-baseline gap-2 px-0.5">
                <span className="font-bold capitalize">
                  {dayLabel(day.date, locale)}
                </span>
                {isToday && (
                  <span className="text-[0.72rem] font-bold uppercase tracking-wide text-accent">
                    {t('today')}
                  </span>
                )}
              </div>
              {day.meals.map((m) => (
                <button
                  key={m.id}
                  onClick={() => openSheet(m.id)}
                  className={cn(
                    'mt-2 flex w-full flex-col gap-1 rounded-[var(--radius-card)] border border-line bg-surface p-3 text-left first:mt-0',
                    isPast && 'bg-surface2',
                    m.isEatingOut && 'border-dashed text-muted',
                  )}
                >
                  <span className="text-[0.7rem] font-bold uppercase tracking-wide text-muted">
                    {m.slotName}
                    {m.actualDish && ` · ${t('consumedLabel')}`}
                  </span>
                  {m.isEatingOut ? (
                    <span className="text-[0.95rem]">🍽 {t('eatingOut')}</span>
                  ) : m.consumedDish ? (
                    <>
                      <span className="font-display text-[1.02rem]">
                        {m.consumedDish.title}
                      </span>
                      {m.actualDish &&
                        m.plannedDish &&
                        m.actualDish.id !== m.plannedDish.id && (
                          <span className="mt-0.5">
                            <Chip tone="neutral">
                              {t('insteadOf', { title: m.plannedDish.title })}
                            </Chip>
                          </span>
                        )}
                    </>
                  ) : (
                    <span className="text-[0.9rem] text-muted">
                      {t('tapToAdd')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Bottom sheet */}
      {openMeal && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40"
            onClick={closeSheet}
            aria-hidden
          />
          <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface p-4 pb-8 md:bottom-6 md:rounded-3xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded bg-line" />
            <h3 className="font-display text-[1.2rem]">
              {openMeal.consumedDish?.title ?? openMeal.slotName}
            </h3>
            <p className="mb-3 text-[0.82rem] text-muted capitalize">
              {dayLabel(openMeal.date, locale)} · {openMeal.slotName}
            </p>

            {mode === 'actions' && (
              <div className="flex flex-col gap-2">
                {openMeal.plannedDish && (
                  <Link
                    href={`/ricetta/${openMeal.plannedDish.id}`}
                    className="w-full"
                  >
                    <Button block>{t('viewRecipe')}</Button>
                  </Link>
                )}
                {!openMeal.isEatingOut && (
                  <Button onClick={() => setMode('editPlan')}>
                    {openMeal.plannedDish ? t('editRecipe') : t('addRecipe')}
                  </Button>
                )}
                {!openMeal.isEatingOut && openMeal.plannedDish && (
                  <Button onClick={() => setMode('consumed')}>
                    {t('markConsumed')}
                  </Button>
                )}
                <Button onClick={() => toggleEatingOut(openMeal)} disabled={pending}>
                  {openMeal.isEatingOut ? t('backHome') : t('markEatingOut')}
                </Button>
                {(openMeal.plannedDish ||
                  openMeal.actualDish ||
                  openMeal.isEatingOut) && (
                  <Button
                    variant="ghost"
                    onClick={() => clearCell(openMeal)}
                    disabled={pending}
                  >
                    {t('clear')}
                  </Button>
                )}
              </div>
            )}

            {mode === 'editPlan' && (
              <DishForm
                initial={
                  openMeal.plannedDish
                    ? {
                        title: openMeal.plannedDish.title,
                        servingsBase: openMeal.plannedDish.servingsBase,
                        steps: openMeal.plannedDish.steps,
                        ingredients: openMeal.plannedDish.ingredients.map((i) => ({
                          name: i.name,
                          quantity: i.quantity,
                          unit: i.unit,
                        })),
                      }
                    : undefined
                }
                onSubmit={(v) => savePlanDish(openMeal, v)}
                onCancel={() => setMode('actions')}
                busy={pending}
              />
            )}

            {mode === 'consumed' && (
              <div className="flex flex-col gap-2">
                <Button
                  variant="primary"
                  onClick={() => consumeAsPlanned(openMeal)}
                  disabled={pending}
                >
                  {t('consumedAsPlanned')}
                </Button>
                <Button onClick={() => setMode('consumedOther')}>
                  {t('consumedOther')}
                </Button>
                <Button variant="ghost" onClick={() => setMode('actions')}>
                  {tc('back')}
                </Button>
              </div>
            )}

            {mode === 'consumedOther' && (
              <DishForm
                onSubmit={(v) => consumeOther(openMeal, v)}
                onCancel={() => setMode('consumed')}
                busy={pending}
              />
            )}

            <button
              onClick={closeSheet}
              className="mt-4 w-full text-center text-[0.85rem] text-muted"
            >
              {t('close')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
