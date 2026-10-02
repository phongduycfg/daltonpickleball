import type { Metadata } from 'next';
import { getAppContext, getPendingMembers } from '@/lib/data';
import { AdminView } from '@/components/admin/admin-view';

export const metadata: Metadata = { title: 'Quản trị' };

export default async function AdminPage() {
  const { me } = await getAppContext();
  // Danh sách chờ duyệt chỉ Quản trị viên đọc được (RLS) — vai trò khác không cần truy vấn
  const pending = me.role === 'admin' ? await getPendingMembers() : [];
  return <AdminView pending={pending} />;
}
