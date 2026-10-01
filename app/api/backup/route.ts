import { NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { todayVN } from '@/lib/dates';

/**
 * Sao lưu dữ liệu CLB ra file JSON (chỉ Quản trị viên).
 * Dùng phiên của người dùng → RLS vẫn áp dụng; không xuất bảng đăng ký push.
 */
export async function GET() {
  const me = await getCurrentMember();
  if (!me || me.status !== 'active' || me.role !== 'admin') {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }
  const supabase = await createClient();
  const tables = ['club_settings', 'profiles', 'venues', 'periods', 'sessions', 'session_results', 'ledger_items', 'period_exclusions', 'payments'] as const;
  const results = await Promise.all(tables.map((t) => supabase.from(t).select('*')));
  const failed = results.find((r) => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });

  const payload = {
    app: 'dalton-pickleball',
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedBy: me.email,
    data: Object.fromEntries(tables.map((t, i) => [t, results[i]?.data ?? []])),
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="dalton-backup-${todayVN()}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
