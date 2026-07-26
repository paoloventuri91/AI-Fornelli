import { cn } from '@/lib/cn';

export function Stepper({ total, current }: { total: number; current: number }) {
  return (
    <div className="mb-4 flex gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1 flex-1 rounded-sm',
            i <= current ? 'bg-accent' : 'bg-surface2',
          )}
        />
      ))}
    </div>
  );
}
