/**
 * انتزاع پلتفرم — برای آماده‌سازی بسته‌بندی Desktop (Electron / Tauri).
 *
 * هر کد browser-only (مثل window.print، localStorage، URL.createObjectURL)
 * که در آینده ممکن است در Desktop رفتار متفاوتی داشته باشد، باید از
 * این لایه عبور کند تا جایگزینی آسان شود.
 */

export const platform = {
  isBrowser: typeof window !== "undefined",
  isDesktop:
    typeof navigator !== "undefined" &&
    (/Electron/i.test(navigator.userAgent) || (window as any).__TAURI__ !== undefined),

  /** چاپ صفحه — در Electron می‌توان به webContents.print تغییر داد. */
  print(): void {
    if (typeof window !== "undefined") window.print();
  },

  /** ذخیره فایل برای دانلود — در Desktop می‌توان از dialog.showSaveDialog استفاده کرد. */
  downloadBlob(blob: Blob, filename: string): void {
    if (typeof window === "undefined") return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  /** ذخیره مقدار محلی — در Desktop می‌تواند به فایل سیستم متصل شود. */
  storage: {
    get(key: string): string | null {
      try {
        return typeof window !== "undefined" ? localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    },
    set(key: string, value: string): void {
      try {
        if (typeof window !== "undefined") localStorage.setItem(key, value);
      } catch {}
    },
    remove(key: string): void {
      try {
        if (typeof window !== "undefined") localStorage.removeItem(key);
      } catch {}
    },
  },
};
