const FA = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];

export function toFaDigits(input: number | string | null | undefined): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[0-9]/g, (d) => FA[+d]);
}

export function formatJalali(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  try {
    const fmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    return fmt.format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function formatNumber(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '۰';
  const num = Number(n);
  if (isNaN(num)) return '۰';
  return toFaDigits(num.toLocaleString('en-US'));
}
