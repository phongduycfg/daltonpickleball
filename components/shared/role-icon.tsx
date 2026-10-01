import { Crown, PenLine, User, Wallet, type LucideProps } from 'lucide-react';
import type { AppRole } from '@/types/database';

const ICONS = { admin: Crown, accountant: Wallet, scorer: PenLine, member: User } as const;

/** Icon theo vai trò */
export function RoleIcon({ role, ...props }: { role: AppRole } & LucideProps) {
  const Icon = ICONS[role];
  return <Icon aria-hidden {...props} />;
}
