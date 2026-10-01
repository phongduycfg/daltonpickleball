import type { Metadata } from 'next';
import { getAppContext, getPendingMembers } from '@/lib/data';
import { viewFromSettlement } from '@/lib/payments-view';
import { AdminView } from '@/components/admin/admin-view';

export const metadata: Metadata = { title: 'Quản trị' };

export default async function AdminPage() {
  const { me, period, data, result, members } = await getAppContext();
  // Danh sách chờ duyệt chỉ Quản trị viên đọc được (RLS) — vai trò khác không cần truy vấn
  const pending = me.role === 'admin' ? await getPendingMembers() : [];
  const { items } = viewFromSettlement({ result, plan: period.plan, fixedRate: period.fixedRate, payments: data.payments, ledger: data.ledger, members });
  return <AdminView pending={pending} items={items} />;
}
