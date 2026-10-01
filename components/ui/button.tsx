import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/** Nút bấm chuẩn shadcn/ui, biến thể theo thiết kế v7 */
const buttonVariants = cva(
  'press inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/60 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        lime: 'bg-lime font-bold text-ink shadow-glow hover:brightness-105',
        dark: 'border border-white/10 bg-card2 text-white hover:bg-[#182742]',
        ghost: 'text-slate-300 hover:bg-white/5',
        outline: 'border border-white/30 bg-ink/70 text-white backdrop-blur',
        danger: 'bg-live font-bold text-white',
        'danger-outline': 'border border-live/50 text-[#FCA5A5]',
      },
      size: {
        sm: 'h-9 rounded-xl px-3 text-xs',
        md: 'h-11 rounded-2xl px-4 text-sm',
        lg: 'h-12 rounded-2xl px-5 text-[15px]',
        icon: 'size-9 rounded-xl',
      },
    },
    defaultVariants: { variant: 'dark', size: 'md' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = 'Button';

export { buttonVariants };
