import type { PeriodSnapshot } from '@/lib/snapshot';
import { fullDate } from '@/lib/dates';
import { vnd } from '@/lib/format';
import { bankName } from '@/lib/vietqr';

/**
 * Báo cáo kỳ (khổ A4, nền trắng) — chỉ render khi xuất PDF.
 * Dùng màu hex cố định để bản in rõ ràng bất kể giao diện tối của app.
 */
export function ReportDocument({ snapshot, title, clubName }: { snapshot: PeriodSnapshot; title: string; clubName: string }) {
  const s = snapshot;
  const range = s.firstDate && s.lastDate ? `${fullDate(s.firstDate)} – ${fullDate(s.lastDate)}` : 'Chưa có buổi chơi';
  const th = 'border-b border-[#CBD5E1] px-2 py-1.5 text-left font-semibold';
  const td = 'border-b border-[#E2E8F0] px-2 py-1.5';

  return (
    <div className="w-[760px] bg-white p-6 font-sans text-[12px] text-[#0F172A]">
      <div className="flex items-end justify-between border-b-2 border-[#0F172A] pb-3">
        <div>
          <div className="text-[20px] font-extrabold">{clubName}</div>
          <div className="text-[14px] font-semibold">Báo cáo chia tiền · {title}</div>
        </div>
        <div className="text-right text-[11px] text-[#475569]">
          <div>{range}</div>
          <div>Phương án: {s.plan === 1 ? 'Chia theo số trận thua' : `Cố định ${vnd(s.fixedRate)}/trận + chia phần hụt`}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          ['Số buổi', `${s.sessionCount}`],
          ['Sân + nước', vnd(s.sessionCost)],
          ['Chi khác / Thu khác', `${vnd(s.expenseTotal)} / ${vnd(s.incomeTotal)}`],
          ['Tổng chi phí', vnd(s.totalCost)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-[#E2E8F0] p-2">
            <div className="text-[10px] text-[#64748B]">{k}</div>
            <div className="text-[13px] font-bold">{v}</div>
          </div>
        ))}
      </div>

      <table className="mt-4 w-full border-collapse">
        <thead className="bg-[#F1F5F9]">
          <tr>
            <th className={th}>#</th>
            <th className={th}>Thành viên</th>
            <th className={`${th} text-right`}>Buổi</th>
            <th className={`${th} text-right`}>Thua</th>
            <th className={`${th} text-right`}>Phải gánh</th>
            <th className={`${th} text-right`}>Đã ứng</th>
            <th className={`${th} text-right`}>Net</th>
            <th className={th}>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {s.rows
            .filter((r) => r.sessions > 0 || r.net !== 0 || r.isAccountant)
            .map((r, i) => (
              <tr key={r.memberId}>
                <td className={td}>{i + 1}</td>
                <td className={`${td} font-semibold`}>
                  {r.name}
                  {r.isAccountant ? ' (Kế toán)' : ''}
                </td>
                <td className={`${td} text-right`}>{r.sessions}</td>
                <td className={`${td} text-right`}>{r.losses}</td>
                <td className={`${td} text-right`}>{vnd(r.burden)}</td>
                <td className={`${td} text-right`}>{vnd(r.advanced)}</td>
                <td className={`${td} text-right font-bold ${r.net < 0 ? 'text-[#15803D]' : ''}`}>{r.net < 0 ? `+${vnd(-r.net)}` : vnd(r.net)}</td>
                <td className={td}>{r.statusLabel}</td>
              </tr>
            ))}
        </tbody>
      </table>

      {s.items.length ? (
        <>
          <div className="mt-4 text-[13px] font-bold">Khoản thu / chi khác</div>
          <table className="mt-1 w-full border-collapse">
            <tbody>
              {s.items.map((it, i) => (
                <tr key={`${it.description}-${i}`}>
                  <td className={td}>{it.kind === 'expense' ? 'Chi' : 'Thu'}</td>
                  <td className={td}>{it.description}</td>
                  <td className={td}>
                    {it.kind === 'expense' ? 'Chi bởi' : 'Giữ bởi'} {it.memberName}
                  </td>
                  <td className={`${td} text-right font-semibold`}>{(it.kind === 'expense' ? '+' : '−') + vnd(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      <div className="mt-4 rounded-lg bg-[#F8FAFC] p-3 text-[11px] text-[#334155]">
        <b>Tài khoản nhận tiền:</b> {bankName(s.bank.bin)} · {s.bank.accountNo ?? '—'} · {s.bank.owner ?? '—'}
        <br />
        Net = Phải gánh − Đã ứng. Số dương: cần chuyển khoản cho Kế toán · số âm: được nhận lại.
      </div>
    </div>
  );
}
