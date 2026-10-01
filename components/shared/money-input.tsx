'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { formatAmountInput, parseAmountInput } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Ô nhập tiền: bàn phím số trên mobile, tự thêm dấu phẩy ngăn cách */
export const MoneyInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & { value: number; onValueChange: (v: number) => void }
>(({ value, onValueChange, className, ...props }, ref) => (
  <input
    ref={ref}
    type="text"
    inputMode="numeric"
    autoComplete="off"
    value={formatAmountInput(value)}
    onChange={(e) => onValueChange(parseAmountInput(e.target.value))}
    className={cn('field tabular-nums', className)}
    {...props}
  />
));
MoneyInput.displayName = 'MoneyInput';
