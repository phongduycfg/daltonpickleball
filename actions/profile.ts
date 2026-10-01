'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { actionContext, check, ok, toActionError, ActionError, type ActionResult } from '@/lib/action';
import { profileSchema, pushSubscriptionSchema } from '@/lib/validation';
import { publicEnv } from '@/lib/env';

/** Cập nhật tên hiển thị + ảnh đại diện (ảnh đã được tải lên Storage từ client) */
export async function updateProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  try {
    const v = profileSchema.parse(input);
    const { supabase, me } = await actionContext();
    // Chỉ chấp nhận ảnh nằm trong thư mục avatars/<id của chính mình>/ hoặc ảnh Google hiện có
    const ownPrefix = `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${me.id}/`;
    if (v.avatarUrl && !v.avatarUrl.startsWith(ownPrefix) && v.avatarUrl !== me.avatarUrl) {
      throw new ActionError('Ảnh đại diện không hợp lệ');
    }
    check(await supabase.from('profiles').update({ display_name: v.name, avatar_url: v.avatarUrl }).eq('id', me.id));
    revalidatePath('/', 'layout');
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/** Lưu đăng ký Web Push của thiết bị hiện tại */
export async function savePushSubscription(input: z.input<typeof pushSubscriptionSchema>): Promise<ActionResult> {
  try {
    const v = pushSubscriptionSchema.parse(input);
    const { supabase, me } = await actionContext();
    check(
      await supabase
        .from('push_subscriptions')
        .upsert({ user_id: me.id, endpoint: v.endpoint, p256dh: v.keys.p256dh, auth: v.keys.auth }, { onConflict: 'endpoint' }),
    );
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  try {
    const ep = z.string().url().parse(endpoint);
    const { supabase, me } = await actionContext();
    check(await supabase.from('push_subscriptions').delete().eq('endpoint', ep).eq('user_id', me.id));
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
