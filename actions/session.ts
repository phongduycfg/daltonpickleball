'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import { SCORER_ROLES, COST_ROLES } from '@/lib/constants';
import { actionContext, check, ok, toActionError, type ActionResult } from '@/lib/action';
import { createSessionSchema, money, uuid } from '@/lib/validation';
import { sendPush } from '@/lib/push';
import { todayVN } from '@/lib/dates';

/** Làm mới toàn bộ màn hình trong nhóm (app) sau khi dữ liệu thay đổi */
const refresh = () => revalidatePath('/', 'layout');

/**
 * Thêm buổi chơi.
 * - Hôm nay / tương lai: lịch "Sắp diễn ra", bấm Bắt đầu khi ra sân.
 * - Ngày đã qua (nhập bù / khôi phục): tạo thẳng ở trạng thái "Đã kết thúc" qua RPC create_past_session
 *   để điểm danh và ghi trận thua ngay. Chỉ nhập bù được trong kỳ đang mở.
 */
export async function createSession(input: z.input<typeof createSessionSchema>): Promise<ActionResult<{ id: string; past: boolean }>> {
  try {
    const v = createSessionSchema.parse(input);
    const { supabase, me } = await actionContext(SCORER_ROLES);

    if (v.date < todayVN()) {
      const { data } = check(
        await supabase.rpc('create_past_session', { p_venue: v.venueId, p_date: v.date, p_start: v.start, p_end: v.end, p_cost: v.cost }),
      );
      refresh();
      return ok({ id: data as string, past: true });
    }

    const { data } = check(
      await supabase
        .from('sessions')
        .insert({
          period_id: v.periodId,
          venue_id: v.venueId,
          play_date: v.date,
          start_time: v.start,
          end_time: v.end,
          cost: v.cost,
          created_by: me.id,
        })
        .select('id')
        .single(),
    );
    refresh();
    return ok({ id: (data as { id: string }).id, past: false });
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

/**
 * Xoá hẳn 1 buổi: lịch chưa chơi (huỷ lịch) hoặc buổi đã kết thúc (xoá kèm kết quả trận thua).
 * RPC delete_session chặn buổi đang diễn ra / kỳ đã đóng và đánh số lại các buổi còn lại.
 */
export async function deleteSession(sessionId: string): Promise<ActionResult> {
  try {
    const id = uuid.parse(sessionId);
    const { supabase } = await actionContext(SCORER_ROLES);
    check(await supabase.rpc('delete_session', { p_session: id }));
    refresh();
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
