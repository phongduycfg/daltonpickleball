/** Khai báo kiểu tối thiểu cho html2pdf.js (thư viện không kèm sẵn type) */
declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | [number, number] | [number, number, number, number];
    filename?: string;
    image?: { type?: 'jpeg' | 'png' | 'webp'; quality?: number };
    html2canvas?: { scale?: number; useCORS?: boolean; backgroundColor?: string };
    jsPDF?: { unit?: 'mm' | 'pt' | 'px' | 'in'; format?: string; orientation?: 'portrait' | 'landscape' };
    pagebreak?: { mode?: string | string[] };
  }
  interface Html2PdfWorker {
    set(options: Html2PdfOptions): Html2PdfWorker;
    from(source: HTMLElement | string): Html2PdfWorker;
    save(): Promise<void>;
  }
  const html2pdf: () => Html2PdfWorker;
  export default html2pdf;
}
