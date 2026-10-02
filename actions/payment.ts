'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import { FINANCE_ROLES } from '@/lib/constants';
import { actionContext, check, ok, toActionError, ActionError, type ActionResult } from '@/lib/action';
import { ledgerItemSchema, uuid } from '@/lib/validation';
import { sendPush } from '@/lib/push';
import { loadClub, settleOpenPeriod, snapshotOfPeriod } from '@/lib/data';
import { vnd } from '@/lib/format';
import { periodCode, periodLabel } from '@/lib/dates';

const refresh = () => revalidatePath('/', 'layout');

export async function setPlan(periodId: string, plan: 1 | 2): Promise<ActionResult> {
  try {
    const v = z.object({ periodId: uuid, plan: z.union([z.literal(1), z.literal(2)]) }).parse({ periodId, plan });
    const { supabase } = await actionContext(FINANCE_ROLES);
    check(await supabase.from('periods').update({ plan: v.plan }).eq('id', v.periodId));
    refresh();
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function setExclusion(periodId: string, memberId: string, excluded: boolean): Promise<ActionResult> {
  try {
    const v = z.object({ periodId: uuid, memberId: uuid, excluded: z.boolean() }).parse({ periodId, memberId, excluded });
    const { supabase } = await actionContext(FINANCE_ROLES);
    if (v.excluded) {
      check(await supabase.from('period_exclusions').upsert({ period_id: v.periodId, member_id: v.memberId }, { ignoreDuplicates: true }));
    } else {
      check(await supabase.from('period_exclusions').delete().eq('period_id', v.periodId).eq('member_id', v.memberId));
    }
    refresh();
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function addLedgerItem(input: z.input<typeof ledgerItemSchema>): Promise<ActionResult> {
  try {
    const v = ledgerItemSchema.parse(input);
    const { supabase, me } = await actionContext(FINANCE_ROLES);
    check(
      await supabase.from('ledger_items').insert({
        period_id: v.periodId,
        kind: v.kind,
        description: v.description,
        amount: v.amount,
        member_id: v.memberId,
        created_by: me.id,
      }),
    );
    refresh();
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function removeLedgerItem(itemId: string): Promise<ActionResult> {
  try {
    const id = uuid.parse(itemId);
    const { supabase } = await actionContext(FINANCE_ROLES);
    const { count } = check(await supabase.from('ledger_items').delete({ count: 'exact' }).eq('id', id));
    if (!count) throw new ActionError('Không xoá được khoản này (kỳ đã đóng?)');
    refresh();
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/** Thành viên báo "Tôi đã chuyển" → chờ Kế toán xác nhận */
export async function reportPayment(periodId: string): Promise<ActionResult> {
  try {
    const id = uuid.parse(periodId);
    const { supabase, me } = await actionContext();
    check(await supabase.rpc('report_payment', { p_period: id }));
    refresh();
    after(() =>
      sendPush({ roles: ['accountant'] }, { title: 'Có khoản chuyển cần xác nhận', body: `${me.name} báo đã chuyển khoản`, url: '/payments', tag: 'payment' }),
    );
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/** Kế toán xác nhận / từ chối / đánh dấu đã trả lại */
export async function setPaymentStatus(periodId: string, memberId: string, status: 'none' | 'pending' | 'done'): Promise<ActionResult> {
  try {
    const v = z.object({ periodId: uuid, memberId: uuid, status: z.enum(['none', 'pending', 'done']) }).parse({ periodId, memberId, status });
    const { supabase } = await actionContext(FINANCE_ROLES);
    // Trạng thái trước đó — để chỉ gửi thông báo đúng ngữ cảnh (xác nhận / từ chối báo chuyển)
    const { data: prev } = await supabase.from('payments').select('status').eq('period_id', v.periodId).eq('member_id', v.memberId).maybeSingle();
    check(await supabase.rpc('set_payment_status', { p_period: v.periodId, p_member: v.memberId, p_status: v.status }));
    refresh();
    if (v.status === 'done' && prev?.status !== 'done') {
      after(() => sendPush({ userIds: [v.memberId] }, { title: 'Thanh toán đã hoàn tất ✅', body: 'Kế toán đã xác nhận khoản tiền kỳ này của bạn', url: '/payments', tag: 'payment' }));
    } else if (v.status === 'none' && prev?.status === 'pending') {
      after(() => sendPush({ userIds: [v.memberId] }, { title: 'Chưa nhận được tiền', body: 'Kế toán chưa thấy khoản chuyển của bạn, vui lòng kiểm tra lại', url: '/payments', tag: 'payment' }));
    }
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/**
 * Đóng kỳ: snapshot được tính lại HOÀN TOÀN phía server từ database
 * (không nhận số liệu từ client), rồi lưu qua RPC close_period.
 */
export async function closePeriod(periodId: string, confirmCode: string): Promise<ActionResult> {
  try {
    const id = uuid.parse(periodId);
    const { supabase } = await actionContext(FINANCE_ROLES);
    const club = await loadClub();
    if (!club?.active || club.period.id !== id) throw new ActionError('Kỳ không tồn tại hoặc đã đóng');
    const { period, data, members, settings } = club;
    if (confirmCode.trim().toUpperCase() !== periodCode(period)) throw new ActionError('Mã xác nhận không đúng');

    const { result } = settleOpenPeriod({ period, data, members });
    const snapshot = snapshotOfPeriod({ period, data, members, settings, result });

    check(await supabase.rpc('close_period', { p_period: id, p_snapshot: snapshot }));
    refresh();
    after(() =>
      sendPush({ roles: ['admin', 'accountant', 'scorer', 'member'] }, { title: `Đã chốt ${periodLabel(period)}`, body: `Tổng chi phí ${vnd(result.totalCost)} — mở app để xem số tiền của bạn`, url: '/payments', tag: 'period' }),
    );
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
