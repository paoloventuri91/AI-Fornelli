'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';
import { clearVoteAction, setVoteAction } from '@/server/votes-actions';

type VoteProfile = { id: number; name: string; color: string };

export function DishVotes({
  dishId,
  profiles,
  votes,
}: {
  dishId: number;
  profiles: VoteProfile[];
  votes: Record<number, number>; // profileId → value
}) {
  const t = useTranslations('recipe');
  const router = useRouter();
  const [pending, start] = useTransition();

  function vote(profileId: number, value: 1 | -1) {
    const current = votes[profileId];
    start(async () => {
      if (current === value) await clearVoteAction(profileId, dishId);
      else await setVoteAction(profileId, dishId, value);
      router.refresh();
    });
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-3.5">
      <div className="flex items-center justify-between">
        <b>{t('likePrompt')}</b>
        <span className="text-[0.82rem] text-muted">{t('votesHint')}</span>
      </div>
      {profiles.map((p) => {
        const current = votes[p.id];
        return (
          <div
            key={p.id}
            className="flex items-center gap-2.5 border-t border-line py-2 first:border-t-0"
          >
            <Avatar name={p.name} color={p.color} size={30} />
            <span className="flex-1 font-semibold">{p.name}</span>
            <button
              type="button"
              onClick={() => vote(p.id, 1)}
              disabled={pending}
              aria-pressed={current === 1}
              className={cn(
                'h-8 w-9 rounded-lg border border-line',
                current === 1 && 'border-good bg-good-soft',
              )}
            >
              👍
            </button>
            <button
              type="button"
              onClick={() => vote(p.id, -1)}
              disabled={pending}
              aria-pressed={current === -1}
              className={cn(
                'h-8 w-9 rounded-lg border border-line',
                current === -1 && 'border-bad bg-bad-soft',
              )}
            >
              👎
            </button>
          </div>
        );
      })}
    </div>
  );
}
