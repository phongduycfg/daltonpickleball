'use client';

import type { Session } from '@/types/app';
import { useSessionScoring } from '@/hooks/use-session-scoring';
import { SessionSheet } from './session-sheet';

/** Bọc SessionSheet kèm trạng thái ghi kèo riêng (dùng ở màn Sân đấu) */
export function SessionSheetHost(props: {
  session: Session;
  periodTotals: Record<string, number>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const scoring = useSessionScoring(props.session);
  return <SessionSheet {...props} scoring={scoring} />;
}
