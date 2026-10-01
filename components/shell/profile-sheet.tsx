'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageUp, LoaderCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/shared/member-avatar';
import { SkillChip } from '@/components/shared/skill-chip';
import { Field } from '@/components/shared/select-field';
import { useClub } from '@/components/providers/club-provider';
import { useServerAction } from '@/hooks/use-server-action';
import { updateProfile } from '@/actions/profile';
import { getBrowserClient } from '@/lib/supabase/client';
import { resizeAvatar } from '@/lib/image';

/** Sửa tên hiển thị + ảnh đại diện (ảnh tải thẳng lên Supabase Storage: avatars/<uid>/…) */
export function ProfileSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { me } = useClub();
  const [name, setName] = useState(me.name);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(me.avatarUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { pending, run } = useServerAction();

  // Mở lại sheet → nạp giá trị hiện tại
  useEffect(() => {
    if (open) {
      setName(me.name);
      setAvatarUrl(me.avatarUrl);
      setPreview(null);
    }
  }, [open, me.name, me.avatarUrl]);

  // Giải phóng URL tạm của ảnh xem trước
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const blob = await resizeAvatar(file);
      setPreview(URL.createObjectURL(blob));
      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${me.id}/${Date.now()}.${ext}`;
      const storage = getBrowserClient().storage.from('avatars');
      const { error } = await storage.upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
      if (error) throw new Error('Tải ảnh lên thất bại — thử lại');
      setAvatarUrl(storage.getPublicUrl(path).data.publicUrl);
    } catch (e) {
      setPreview(null);
      toast.error(e instanceof Error ? e.message : 'Không tải được ảnh');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const shown = { id: me.id, name: name.trim() || me.name, avatarUrl: preview ?? avatarUrl };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Thông tin cá nhân">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <MemberAvatar member={shown} size="xl" />
            {uploading ? (
              <div className="absolute inset-0 grid place-items-center rounded-full bg-black/60">
                <LoaderCircle className="size-6 animate-spin" aria-label="Đang tải ảnh" />
              </div>
            ) : null}
          </div>
          <div className="flex-1 space-y-2">
            <Button type="button" variant="dark" className="w-full" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <ImageUp className="text-lime" />
              Chọn / tải ảnh
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPick(e.target.files?.[0])} />
            {avatarUrl ? (
              <button
                type="button"
                onClick={() => {
                  setAvatarUrl(null);
                  setPreview(null);
                }}
                className="press flex h-9 w-full items-center justify-center gap-1 text-xs text-slate-400"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Xoá ảnh
              </button>
            ) : null}
          </div>
        </div>

        <Field label="Tên hiển thị">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="field" autoComplete="nickname" />
        </Field>

        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span>Trình độ:</span>
          <SkillChip value={me.skill} />
          <span className="text-xs text-slate-400">(Quản trị viên chỉnh)</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="dark" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            variant="lime"
            disabled={uploading || pending || !name.trim()}
            onClick={() =>
              run(() => updateProfile({ name: name.trim(), avatarUrl }), { success: 'Đã cập nhật hồ sơ', onSuccess: () => onOpenChange(false) })
            }
          >
            Lưu
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
