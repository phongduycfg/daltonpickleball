'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import type { PeriodSnapshot } from '@/lib/snapshot';
import { ReportDocument } from './report-document';

/**
 * Xuất báo cáo PDF ngay trên trình duyệt (html2pdf.js, tải động khi cần → không làm nặng bundle).
 * Báo cáo được render tạm ngoài màn hình rồi chụp thành PDF khổ A4.
 */
export function useReportExport(snapshot: PeriodSnapshot, meta: { title: string; clubName: string; fileCode: string }) {
  const [job, setJob] = useState<{ resolve: (ok: boolean) => void } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  // Chặn chạy 2 lần (React Strict Mode gọi effect 2 lần khi phát triển)
  const running = useRef(false);

  useEffect(() => {
    if (!job || !ref.current || running.current) return;
    running.current = true;
    const el = ref.current;
    let done = false;
    (async () => {
      try {
        const { default: html2pdf } = await import('html2pdf.js');
        await html2pdf()
          .set({
            margin: [8, 8, 8, 8],
            filename: `Dalton-Pickleball-${meta.fileCode}.pdf`,
            image: { type: 'jpeg', quality: 0.96 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] },
          })
          .from(el)
          .save();
        done = true;
        toast.success('Đã xuất báo cáo PDF');
      } catch {
        toast.error('Xuất PDF thất bại — thử lại');
      } finally {
        running.current = false;
        job.resolve(done);
        setJob(null);
      }
    })();
  }, [job, meta.fileCode]);

  const exportPdf = useCallback(() => new Promise<boolean>((resolve) => setJob({ resolve })), []);

  const node = job
    ? createPortal(
        <div aria-hidden style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>
          <div ref={ref}>
            <ReportDocument snapshot={snapshot} title={meta.title} clubName={meta.clubName} />
          </div>
        </div>,
        document.body,
      )
    : null;

  return { exporting: !!job, exportPdf, node };
}
