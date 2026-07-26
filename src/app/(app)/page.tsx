import { getDb } from '@/server/db';
import { getSettings } from '@/server/services/settings';
import { listMealSlots } from '@/server/services/mealSlots';
import { getWeek, weekStartFor } from '@/server/services/planning';
import { PlanClient } from './plan-client';

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA'); // yyyy-mm-dd in ora locale
}
function addDaysISO(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const db = getDb();
  const settings = getSettings(db);
  const slots = listMealSlots(db);
  const today = todayISO();

  const { w } = await searchParams;
  const requested = w && /^\d{4}-\d{2}-\d{2}$/.test(w) ? w : today;
  const weekStart = weekStartFor(requested, settings.weekStartDay);

  const week = getWeek(db, weekStart, slots);

  const endOfWeek = addDaysISO(weekStart, 6);
  const weekLabel = `${new Date(`${weekStart}T00:00:00`).toLocaleDateString(
    settings.language,
    { day: 'numeric', month: 'short' },
  )} – ${new Date(`${endOfWeek}T00:00:00`).toLocaleDateString(settings.language, {
    day: 'numeric',
    month: 'short',
  })}`;

  return (
    <PlanClient
      weekStart={weekStart}
      prevWeek={addDaysISO(weekStart, -7)}
      nextWeek={addDaysISO(weekStart, 7)}
      weekLabel={weekLabel}
      today={today}
      constraintsText={week.constraintsText}
      meals={week.meals}
    />
  );
}
