import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'accent' | 'good' | 'bad' | 'warn';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface2 text-muted',
  accent: 'bg-accent-soft text-accent',
  good: 'bg-good-soft text-good',
  bad: 'bg-bad-soft text-bad',
  warn: 'bg-flame-soft text-flame',
};

export function Chip({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[0.75rem] font-semibold',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
