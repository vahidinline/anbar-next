export function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

// Absolute URL for the company logo (works inside about:blank print windows)
export const BRAND_LOGO_URL =
  typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png';

// Reusable branded print header
export function brandHeader(docTitle: string): string {
  return `
    <div class="header">
      <div class="brand-block">
        <img src="${BRAND_LOGO_URL}" alt="فید ایران صنعت" class="brand-logo" />
        <div>
          <div class="brand">فید ایران صنعت</div>
          <div style="font-size:11px;color:#444;">سیستم مدیریت انبار</div>
        </div>
      </div>
      <div class="doc-title">${escapeHtml(docTitle)}</div>
    </div>
  `;
}

// Open a new window with provided HTML and trigger print
export function printHtml(html: string, title = 'چاپ') {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.open();
  w.document.write(`<!doctype html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>${title}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Vazirmatn', Tahoma, Arial, sans-serif; color:#000; margin:0; padding:0; direction: rtl; }
    table { width:100%; border-collapse: collapse; font-size: 12px; }
    th, td { border:1px solid #333; padding:6px 8px; text-align: right; }
    th { background:#f0f0f0; font-weight: 700; }
    .header { display:flex; justify-content: space-between; align-items: center; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:12px; }
    .brand-block { display:flex; align-items:center; gap:10px; }
    .brand-logo { width:54px; height:54px; object-fit:contain; background:#fff; border:1px solid #e5e5e5; border-radius:6px; padding:3px; }
    .brand { font-weight: 800; font-size: 18px; }
    .doc-title { font-size: 16px; font-weight: 700; }
    .meta { display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin: 12px 0; font-size: 12px; }
    .meta div { border:1px solid #ccc; padding:6px 8px; border-radius: 4px; }
    .meta b { margin-left:6px; }
    .footer { margin-top:24px; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:24px; font-size:12px; }
    .sign { border-top:1px solid #000; padding-top:6px; text-align:center; min-height:60px; }
    .notes { margin-top:14px; padding:8px; border:1px dashed #999; font-size:12px; min-height:44px; }
    .labels { display:grid; gap:4mm; }
    .label { border:1px solid #000; padding:6px; text-align:center; page-break-inside: avoid; }
    .label .name { font-weight:700; font-size: 12px; }
    .label .desc { font-size: 10px; color:#333; margin-top:2px; }
    .label .code { font-family: monospace; font-size: 10px; margin-top:2px; }
    @media print { .no-print { display:none !important; } }
  </style>
  </head><body>${html}
  <div class="no-print" style="position:fixed;bottom:10px;left:10px;display:flex;gap:8px;">
    <button onclick="window.print()" style="padding:8px 14px;background:#111;color:#fff;border:0;border-radius:6px;cursor:pointer;">چاپ</button>
    <button onclick="window.close()" style="padding:8px 14px;background:#eee;border:1px solid #999;border-radius:6px;cursor:pointer;">بستن</button>
  </div>
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch {} }, 500);
}

// Convert SVG node to data url string for embedding
export function svgToDataUrl(svg: SVGSVGElement): string {
  const xml = new XMLSerializer().serializeToString(svg);
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
}
