import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getDb } from '@/server/db';
import { getDish } from '@/server/services/dishes';
import { listProfiles } from '@/server/services/profiles';
import { getDishVotes } from '@/server/services/votes';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { DishVotes } from '@/components/dish-votes';

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dishId = Number.parseInt(id, 10);
  if (!Number.isInteger(dishId)) notFound();

  const db = getDb();
  const dish = getDish(db, dishId);
  if (!dish) notFound();

  const profiles = listProfiles(db);
  const voteRows = getDishVotes(db, dishId);
  const votes: Record<number, number> = {};
  for (const v of voteRows) votes[v.profileId] = v.value;

  const t = await getTranslations('recipe');

  return (
    <div className="p-4 md:mx-auto md:max-w-2xl md:p-8">
      <Link href="/" className="mb-2.5 inline-flex gap-1 font-semibold text-accent">
        ‹ {t('back')}
      </Link>
      <h2 className="font-display text-[1.5rem] text-balance">{dish.title}</h2>
      <p className="mb-4 mt-1 flex items-center gap-2 text-[0.85rem] text-muted">
        {t('servings', { n: dish.servingsBase })}
        <Chip tone={dish.source === 'ai' ? 'accent' : 'neutral'}>
          {dish.source === 'ai' ? t('sourceAi') : t('sourceManual')}
        </Chip>
      </p>

      <h4 className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.05em] text-muted">
        {t('ingredients')}
      </h4>
      <Card className="mb-4">
        {dish.ingredients.length === 0 ? (
          <p className="text-[0.9rem] text-muted">—</p>
        ) : (
          dish.ingredients.map((ing) => (
            <div
              key={ing.id}
              className="flex justify-between gap-3 border-b border-line py-2 text-[0.93rem] last:border-b-0"
            >
              <span>{ing.name}</span>
              <span className="tabular-nums text-muted">
                {ing.unit === 'qb'
                  ? 'qb'
                  : `${ing.quantity} ${ing.unit}`}
              </span>
            </div>
          ))
        )}
      </Card>

      {dish.steps.length > 0 && (
        <>
          <h4 className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.05em] text-muted">
            {t('steps')}
          </h4>
          <Card>
            <ol className="flex list-none flex-col gap-1 p-0">
              {dish.steps.map((step, i) => (
                <li key={i} className="flex gap-3 py-2 text-[0.93rem]">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent-soft text-[0.85rem] font-bold text-accent">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Card>
        </>
      )}

      {profiles.length > 0 && (
        <div className="mt-4">
          <DishVotes dishId={dish.id} profiles={profiles} votes={votes} />
        </div>
      )}
    </div>
  );
}
