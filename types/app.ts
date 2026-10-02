import type { AppRole, LedgerKind, PayStatus, SessionStatus } from './database';

/** Thành viên đã chuẩn hoá cho UI */
export interface Member {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: AppRole;
  skill: number;
}

/** Thành viên đang đăng nhập (kèm trạng thái duyệt) */
export interface CurrentMember extends Member {
  status: 'pending' | 'active' | 'rejected';
}

export interface Venue {
  id: string;
  name: string;
  area: string;
  defaultCost: number;
  isActive: boolean;
}

export interface SessionResult {
  memberId: string;
  losses: number;
}

export interface Session {
  id: string;
  periodId: string;
  venueId: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string; // HH:mm
  cost: number;
  status: SessionStatus;
  seq: number | null;
  startedAt: string | null;
  results: SessionResult[];
}

export interface LedgerItem {
  id: string;
  kind: LedgerKind;
  description: string;
  amount: number;
  memberId: string;
}

export interface Period {
  id: string;
  /** Số thứ tự kỳ: Kỳ 1, Kỳ 2… (kỳ không gắn với tháng dương lịch) */
  seq: number;
  /** Ngày bắt đầu / kết thúc (YYYY-MM-DD); endDate = null khi kỳ đang mở */
  startDate: string;
  endDate: string | null;
  plan: 1 | 2;
  fixedRate: number;
  closedAt: string | null;
}

export interface ClubSettings {
  clubName: string;
  fixedRate: number;
  minSessions: number;
  bankBin: string | null;
  bankAccountNo: string | null;
  bankOwner: string | null;
  transferSyntax: string;
}

export type PaymentMap = Record<string, PayStatus>;
