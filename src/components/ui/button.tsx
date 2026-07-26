import { cn } from '@/lib/cn';

type Variant = 'default' | 'primary' | 'ghost';

const base =
  'inline-flex items-center justify-center gap-2 rounded-[10px] px-3.5 py-2.5 text-[0.92rem] font-semibold border transition-colors disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  default: 'border-line bg-surface text-ink hover:bg-surface2',
  primary: 'border-accent bg-accent text-on-accent hover:opacity-90',
  ghost: 'border-transparent text-accent hover:bg-accent-soft',
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  block?: boolean;
};

export function Button({
  variant = 'default',
  block,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], block && 'w-full', className)}
      {...props}
    />
  );
}
