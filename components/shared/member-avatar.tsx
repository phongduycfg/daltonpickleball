import Image from 'next/image';
import { AVATAR_GRADIENTS } from '@/lib/constants';
import { initialOf } from '@/lib/format';
import { cn } from '@/lib/utils';

const SIZES = {
  xs: { box: 'size-7 text-[11px]', px: 28 },
  sm: { box: 'size-9 text-xs', px: 36 },
  md: { box: 'size-10 text-sm', px: 40 },
  md2: { box: 'size-14 text-xl', px: 56 },
  lg: { box: 'size-[68px] text-2xl', px: 68 },
  xl: { box: 'size-20 text-3xl', px: 80 },
} as const;

export type AvatarSize = keyof typeof SIZES;

/** Màu gradient ổn định theo id thành viên */
function gradientOf(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length] ?? AVATAR_GRADIENTS[0];
}

/** Avatar tròn: ảnh (Supabase Storage / Google) hoặc chữ cái đầu trên nền gradient */
export function MemberAvatar({
  member,
  size = 'md',
  dim = false,
  className,
}: {
  member: { id: string; name: string; avatarUrl: string | null };
  size?: AvatarSize;
  dim?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br font-extrabold text-ink ring-2 ring-white/15',
        s.box,
        gradientOf(member.id),
        dim && 'opacity-60 grayscale',
        className,
      )}
    >
      <span aria-hidden>{initialOf(member.name)}</span>
      {member.avatarUrl ? (
        <Image
          src={member.avatarUrl}
          alt=""
          width={s.px}
          height={s.px}
          // Ảnh đại diện đã được thu nhỏ 256px WebP khi tải lên → tải thẳng từ Supabase CDN,
          // không qua bộ tối ưu ảnh của Vercel (tránh thêm 1 chặng mạng + giới hạn gói miễn phí)
          unoptimized
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
    </div>
  );
}

/** Chồng avatar nhỏ (danh sách có mặt) */
export function AvatarStack({
  members,
  max = 5,
}: {
  members: { id: string; name: string; avatarUrl: string | null }[];
  max?: number;
}) {
  const shown = members.slice(0, max);
  const more = members.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((m, i) => (
        <div key={m.id} className={cn('rounded-full ring-2 ring-deep', i > 0 && '-ml-2')}>
          <MemberAvatar member={m} size="xs" />
        </div>
      ))}
      {more > 0 ? (
        <div className="-ml-2 grid size-7 place-items-center rounded-full bg-[#1B2840] text-[11px] font-bold text-slate-200 ring-2 ring-card">+{more}</div>
      ) : null}
    </div>
  );
}
