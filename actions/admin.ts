'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import { FINANCE_ROLES } from '@/lib/constants';
import { actionContext, check, ok, toActionError, ActionError, type ActionResult } from '@/lib/action';
import { bankSettingsSchema, generalSettingsSchema, memberUpdateSchema, uuid, venueSchema } from '@/lib/validation';
import { sendPush } from '@/lib/push';

const refresh = () => revalidatePath('/', 'layout');

/** Duyệt / từ chối / đổi vai trò / chỉnh trình độ (chỉ Quản trị viên) */
export async function updateMember(input: z.input<typeof memberUpdateSchema>): Promise<ActionResult> {
  try {
    const v = memberUpdateSchema.parse(input);
    const { supabase } = await actionContext(['admin']);
    const { data: before } = await supabase.from('profiles').select('status').eq('id', v.memberId).single();
    check(await supabase.rpc('admin_update_member', { p_member: v.memberId, p_role: v.role, p_status: v.status, p_skill: v.skill }));
    refresh();
    if (before?.status === 'pending' && v.status === 'active') {
      after(() => sendPush({ userIds: [v.memberId] }, { title: 'Chào mừng đến Dalton Pickleball 🎉', body: 'Tài khoản của bạn đã được duyệt', url: '/' }));
    }
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function saveVenue(input: z.input<typeof venueSchema>): Promise<ActionResult> {
  try {
    const v = venueSchema.parse(input);
    const { supabase } = await actionContext(['admin']);
    const row = { name: v.name, area: v.area, default_cost: v.defaultCost, is_active: v.isActive };
    if (v.id) check(await supabase.from('venues').update(row).eq('id', v.id));
    else check(await supabase.from('venues').insert(row));
    refresh();
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/**
 * Xoá sân (chỉ Quản trị viên). Sân đã từng có buổi chơi thì giữ lại để không mất lịch sử —
 * database chặn bằng khoá ngoại, khi đó gợi ý chuyển sang "Tạm ngưng".
 */
export async function deleteVenue(venueId: string): Promise<ActionResult> {
  try {
    const id = uuid.parse(venueId);
    const { supabase } = await actionContext(['admin']);
    const { error, count } = await supabase.from('venues').delete({ count: 'exact' }).eq('id', id);
    if (error?.code === '23503') throw new ActionError('Sân đã có buổi chơi nên không xoá được — hãy tắt "Đang hoạt động" để tạm ngưng');
    if (error) throw error;
    if (!count) throw new ActionError('Không tìm thấy sân');
    refresh();
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/** Tài khoản nhận tiền + cú pháp chuyển khoản (Quản trị viên / Kế toán) */
export async function updateBankSettings(input: z.input<typeof bankSettingsSchema>): Promise<ActionResult> {
  try {
    const v = bankSettingsSchema.parse(input);
    const { supabase } = await actionContext(FINANCE_ROLES);
    check(await supabase.rpc('update_bank_settings', { p_bin: v.bin, p_account_no: v.accountNo, p_owner: v.owner, p_syntax: v.syntax }));
    refresh();
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateGeneralSettings(input: z.input<typeof generalSettingsSchema>): Promise<ActionResult> {
  try {
    const v = generalSettingsSchema.parse(input);
    const { supabase } = await actionContext(['admin']);
    check(await supabase.rpc('update_general_settings', { p_club_name: v.clubName, p_fixed_rate: v.fixedRate, p_min_sessions: v.minSessions }));
    refresh();
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
