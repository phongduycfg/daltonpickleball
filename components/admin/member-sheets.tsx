'use client';

import { useState } from 'react';
import { Lock, Minus, Plus, UserX } from 'lucide-react';
import type { AppRole } from '@/types/database';
import type { Member } from '@/types/app';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/shared/member-avatar';
import { SkillChip } from '@/components/shared/skill-chip';
import { RoleIcon } from '@/components/shared/role-icon';
import { useClub } from '@/components/providers/club-provider';
import { useServerAction } from '@/hooks/use-server-action';
import { updateMember } from '@/actions/admin';
import { ROLE_META, ROLE_ORDER } from '@/lib/constants';
import { formatSkill, skillName } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface PendingMember {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

const ROLES: AppRole[] = ['admin', 'accountant', 'scorer', 'member'];
const SKILLS = [-3, -2, -1, 0, 1, 2, 3];
const clampSkill = (v: number) => Math.max(-3, Math.min(3, v));

/** Thành viên sắp theo vai trò rồi theo tên */
export const sortByRole = (list: Member[]) => [...list].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name, 'vi'));

/** Danh sách toàn bộ thành viên */
export function MembersSheet({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (v: boolean) => void; onPick: (id: string) => void }) {
  const { members } = useClub();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Thành viên (${members.length})`}>
      <div className="divide-y divide-white/[.06] rounded-2xl border border-white/[.07] bg-card">
        {sortByRole(members).map((m) => (
          <button key={m.id} type="button" onClick={() => onPick(m.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
            <MemberAvatar member={m} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">{m.name}</div>
              <span className={cn('rounded-md px-1.5 py-0.5 text-[11px]', ROLE_META[m.role].pill)}>{ROLE_META[m.role].label}</span>
            </div>
            <SkillChip value={m.skill} />
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/** Sửa vai trò / trình độ 1 thành viên (Quản trị viên) */
export function MemberSheet({ memberId, onOpenChange }: { memberId: string | null; onOpenChange: (v: boolean) => void }) {
  const { member, can, me } = useClub();
  const [confirmLock, setConfirmLock] = useState(false);
  const { pending, run } = useServerAction();
  const m = memberId ? member(memberId) : undefined;

  const save = (patch: Partial<Pick<Member, 'role' | 'skill'>> & { status?: 'active' | 'rejected' }, success: string) => {
    if (!m) return;
    run(() => updateMember({ memberId: m.id, role: patch.role ?? m.role, skill: patch.skill ?? m.skill, status: patch.status ?? 'active' }), {
      success,
      onSuccess: () => patch.status === 'rejected' && onOpenChange(false),
    });
  };

  return (
    <Sheet
      open={!!m}
      onOpenChange={(v) => {
        if (!v) setConfirmLock(false);
        onOpenChange(v);
      }}
      title={m?.name ?? ''}
      description={m?.email}
    >
      {m ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <MemberAvatar member={m} size="lg" />
            <SkillChip value={m.skill} />
          </div>
          {!can.admin ? (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Lock className="size-3.5" aria-hidden />
              Chỉ Quản trị viên được thay đổi.
            </div>
          ) : null}

          <div>
            <div className="mb-2 text-sm font-semibold">Vai trò</div>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={!can.admin || pending}
                  aria-pressed={m.role === r}
                  onClick={() => m.role !== r && save({ role: r }, `${m.name} → ${ROLE_META[r].label}`)}
                  className={cn(
                    'press flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold disabled:opacity-50',
                    m.role === r ? 'border-lime bg-lime text-ink' : 'border-white/10 text-slate-300',
                  )}
                >
                  <RoleIcon role={r} className="size-4" />
                  {ROLE_META[r].label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-400">CLB chỉ có 1 Kế toán — gán người mới sẽ thay người cũ.</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm font-semibold">
              Trình độ <span className="text-xs text-slate-400">{skillName(m.skill)}</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {SKILLS.map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={!can.admin || pending}
                  aria-pressed={m.skill === v}
                  onClick={() => m.skill !== v && save({ skill: v }, `Trình độ ${m.name}: ${formatSkill(v)}`)}
                  className={cn('press h-11 rounded-xl border text-sm font-bold disabled:opacity-50', m.skill === v ? 'border-lime bg-lime text-ink' : 'border-white/10 text-slate-300')}
                >
                  {formatSkill(v)}
                </button>
              ))}
            </div>
          </div>

          {can.admin && m.id !== me.id ? (
            confirmLock ? (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="dark" onClick={() => setConfirmLock(false)}>
                  Không
                </Button>
                <Button variant="danger" disabled={pending} onClick={() => save({ status: 'rejected' }, `Đã khoá tài khoản ${m.name}`)}>
                  Khoá tài khoản
                </Button>
              </div>
            ) : (
              <Button variant="danger-outline" className="w-full" onClick={() => setConfirmLock(true)}>
                <UserX />
                Khoá tài khoản khỏi CLB
              </Button>
            )
          ) : null}

          <Button variant="lime" className="w-full" onClick={() => onOpenChange(false)}>
            Xong
          </Button>
        </div>
      ) : null}
    </Sheet>
  );
}

/** Duyệt đăng ký Google: chọn vai trò + trình khởi điểm */
export function ApprovalsSheet({ open, onOpenChange, pending: list }: { open: boolean; onOpenChange: (v: boolean) => void; pending: PendingMember[] }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Thêm thành viên" description="Duyệt đăng ký bằng Google">
      <div className="space-y-3">
        {list.map((p) => (
          <ApprovalItem key={p.id} p={p} />
        ))}
        {!list.length ? (
          <div className="rounded-2xl bg-card p-6 text-center text-sm text-slate-400">
            Không còn yêu cầu nào. Gửi đường dẫn ứng dụng cho người mới — họ đăng nhập Google rồi chờ duyệt tại đây.
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

function ApprovalItem({ p }: { p: PendingMember }) {
  const [role, setRole] = useState<AppRole>('member');
  const [skill, setSkill] = useState(0);
  const { pending, run } = useServerAction();
  const when = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(p.createdAt));

  return (
    <div className="rounded-2xl border border-white/[.07] bg-card p-3">
      <div className="flex items-center gap-3">
        <div className="relative">
          <MemberAvatar member={p} size="md" />
          <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full border-2 border-card bg-white text-[11px] font-extrabold text-[#4285F4]" aria-hidden>
            G
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{p.name}</div>
          <div className="truncate text-xs text-slate-400">{p.email}</div>
        </div>
        <span className="shrink-0 text-xs text-slate-400">{when}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {(['member', 'scorer', 'accountant'] as const).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={role === r}
            onClick={() => setRole(r)}
            className={cn('press h-9 rounded-xl border text-xs font-semibold', role === r ? 'border-lime bg-lime text-ink' : 'border-white/10 text-slate-300')}
          >
            {ROLE_META[r].short}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="flex-1 text-xs text-slate-400">Trình khởi điểm</span>
        <button type="button" onClick={() => setSkill(clampSkill(skill - 1))} className="press grid size-9 place-items-center rounded-xl bg-card2" aria-label="Giảm trình độ">
          <Minus className="size-4" />
        </button>
        <SkillChip value={skill} />
        <button type="button" onClick={() => setSkill(clampSkill(skill + 1))} className="press grid size-9 place-items-center rounded-xl bg-card2" aria-label="Tăng trình độ">
          <Plus className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="sm" variant="dark" className="h-10 !text-[#FCA5A5]" disabled={pending} onClick={() => run(() => updateMember({ memberId: p.id, role: 'member', status: 'rejected', skill: 0 }), { success: `Đã từ chối ${p.name}` })}>
          Từ chối
        </Button>
        <Button size="sm" variant="lime" className="h-10" disabled={pending} onClick={() => run(() => updateMember({ memberId: p.id, role, status: 'active', skill }), { success: `Đã duyệt ${p.name}` })}>
          Duyệt
        </Button>
      </div>
    </div>
  );
}
