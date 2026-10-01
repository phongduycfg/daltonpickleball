'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import { SCORER_ROLES, COST_ROLES } from '@/lib/constants';
import { actionContext, check, ok, toActionError, type ActionResult } from '@/lib/action';
import { createSessionSchema, money, uuid } from '@/lib/validation';
import { sendPush } from '@/lib/push';

/** Làm mới toàn bộ màn hình trong nhóm (app) sau khi dữ liệu thay đổi */
const refresh = () => revalidatePath('/', 'layout');

/** (+)/(−) trận thua — nguyên tử trong DB, trả về số trận thua mới */
export async function adjustLoss(sessionId: string, memberId: string, delta: 1 | -1): Promise<ActionResult<number>> {
  try {
    const input = z.object({ sessionId: uuid, memberId: uuid, delta: z.union([z.literal(1), z.literal(-1)]) }).parse({ sessionId, memberId, delta });
    const { supabase } = await actionContext(SCORER_ROLES);
    const { data } = check(await supabase.rpc('adjust_loss', { p_session: input.sessionId, p_member: input.memberId, p_delta: input.delta }));
    refresh();
    return ok(data ?? 0);
  } catch (e) {
    return toActionError(e);
  }
}

/** Chạm tên: có mặt (0 trận thua) / vắng */
export async function setAttendance(sessionId: string, memberId: string, present: boolean): Promise<ActionResult> {
  try {
    const input = z.object({ sessionId: uuid, memberId: uuid, present: z.boolean() }).parse({ sessionId, memberId, present });
    const { supabase } = await actionContext(SCORER_ROLES);
    check(await supabase.rpc('set_attendance', { p_session: input.sessionId, p_member: input.memberId, p_present: input.present }));
    refresh();
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function createSession(input: z.input<typeof createSessionSchema>): Promise<ActionResult> {
  try {
    const v = createSessionSchema.parse(input);
    const { supabase, me } = await actionContext(SCORER_ROLES);
    check(
      await supabase.from('sessions').insert({
        period_id: v.periodId,
        venue_id: v.venueId,
        play_date: v.date,
        start_time: v.start,
        end_time: v.end,
        cost: v.cost,
        created_by: me.id,
      }),
    );
    refresh();
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateSessionCost(sessionId: string, cost: number): Promise<ActionResult> {
  try {
    const v = z.object({ sessionId: uuid, cost: money }).parse({ sessionId, cost });
    const { supabase } = await actionContext(COST_ROLES);
    check(await supabase.from('sessions').update({ cost: v.cost }).eq('id', v.sessionId));
    refresh();
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function startSession(sessionId: string): Promise<ActionResult> {
  try {
    const id = uuid.parse(sessionId);
    const { supabase, me } = await actionContext(SCORER_ROLES);
    check(await supabase.rpc('start_session', { p_session: id }));
    refresh();
    after(() => sendPush({ allExcept: me.id }, { title: 'Buổi chơi bắt đầu 🏓', body: `${me.name} vừa bắt đầu buổi chơi hôm nay`, url: '/', tag: 'session' }));
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function endSession(sessionId: string): Promise<ActionResult> {
  try {
    const id = uuid.parse(sessionId);
    const { supabase } = await actionContext(SCORER_ROLES);
    check(await supabase.rpc('end_session', { p_session: id }));
    refresh();
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function reopenSession(sessionId: string): Promise<ActionResult> {
  try {
    const id = uuid.parse(sessionId);
    const { supabase } = await actionContext(SCORER_ROLES);
    check(await supabase.rpc('reopen_session', { p_session: id }));
    refresh();
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/** Huỷ lịch (chỉ buổi chưa bắt đầu — RLS chặn các trạng thái khác) */
export async function cancelSession(sessionId: string): Promise<ActionResult> {
  try {
    const id = uuid.parse(sessionId);
    const { supabase } = await actionContext(SCORER_ROLES);
    const { count } = check(await supabase.from('sessions').delete({ count: 'exact' }).eq('id', id).eq('status', 'scheduled'));
    if (!count) return { ok: false, error: 'Chỉ huỷ được buổi chưa bắt đầu' };
    refresh();
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
