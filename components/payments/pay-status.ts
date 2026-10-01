import { CircleAlert, CircleCheck, Clock, HandCoins, Minus, Wallet, type LucideIcon } from 'lucide-react';
import type { PayTone } from '@/lib/settlement';

/** Màu + icon cho trạng thái thanh toán */
export const PAY_TONE: Record<PayTone, { className: string; icon: LucideIcon }> = {
  treasurer: { className: 'text-sky-300', icon: Wallet },
  neutral: { className: 'text-slate-400', icon: Minus },
  receive: { className: 'text-emerald-300', icon: HandCoins },
  done: { className: 'text-emerald-300', icon: CircleCheck },
  pending: { className: 'text-sky-300', icon: Clock },
  owe: { className: 'text-warn', icon: CircleAlert },
};
