import { cn } from '@/lib/cn';

// Mappa colore profilo → sfondo avatar (neutri caldi + accento, come nel mockup).
const COLOR_BG: Record<string, string> = {
  clay: '#b5722a',
  blue: '#3e6db8',
  green: '#4e9a6e',
  plum: '#8a5a9e',
  amber: '#c98a2b',
  teal: '#3f8f8f',
  slate: '#6f6759',
};

export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export function Avatar({
  name,
  color = 'slate',
  size = 34,
  className,
  title,
}: {
  name: string;
  color?: string;
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex flex-none items-center justify-center rounded-full font-bold text-white',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: COLOR_BG[color] ?? COLOR_BG.slate,
        fontSize: size * 0.42,
      }}
    >
      {initialOf(name)}
    </span>
  );
}
