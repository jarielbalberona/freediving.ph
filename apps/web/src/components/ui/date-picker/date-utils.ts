import { format, isValid } from 'date-fns';

export function formatDate(date: Date, pattern: 'MM/dd/yyyy' | 'yyyy-MM-dd' = 'MM/dd/yyyy'): string {
  if (!isValid(date)) return '';
  return format(date, pattern);
}

function inferCentury(twoDigitYear: number): number {
  // 00..69 -> 2000..2069, 70..99 -> 1970..1999
  return twoDigitYear <= 69 ? 2000 + twoDigitYear : 1900 + twoDigitYear;
}

function makeDate(y: number, m: number, d: number): Date | null {
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() + 1 !== m || dt.getDate() !== d) return null;
  return dt;
}

export function clampDate(date: Date, min?: Date, max?: Date): Date {
  if (min && date < min) return min;
  if (max && date > max) return max;
  return date;
}

export function parseDateInput(raw: string): Date | null {
  if (!raw) return null;
  const s = raw.trim();

  // Try ISO-like yyyy-mm-dd
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(s);
  if (m) {
    const yyyy = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const dd = parseInt(m[3], 10);
    return makeDate(yyyy, mm, dd);
  }

  // Try mm/dd/yyyy or m/d/yy etc.
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(s);
  if (m) {
    const mm = parseInt(m[1], 10);
    const dd = parseInt(m[2], 10);
    let yyyy = parseInt(m[3], 10);
    if (m[3].length === 2) yyyy = inferCentury(yyyy);
    return makeDate(yyyy, mm, dd);
  }

  // Compact numeric (no separators)
  const digits = s.replace(/\D+/g, '');
  if (!/^\d{5,8}$/.test(digits)) return null;

  // 8 digits: MMDDYYYY
  if (digits.length === 8) {
    const mm = parseInt(digits.slice(0, 2), 10);
    const dd = parseInt(digits.slice(2, 4), 10);
    const yyyy = parseInt(digits.slice(4), 10);
    return makeDate(yyyy, mm, dd);
  }

  // 7 digits: MDDYYYY (first 1 for M)
  if (digits.length === 7) {
    const mm = parseInt(digits.slice(0, 1), 10);
    const dd = parseInt(digits.slice(1, 3), 10);
    const yyyy = parseInt(digits.slice(3), 10);
    return makeDate(yyyy, mm, dd);
  }

  // 6 digits: MMDDYY
  if (digits.length === 6) {
    const mm = parseInt(digits.slice(0, 2), 10);
    const dd = parseInt(digits.slice(2, 4), 10);
    const yy = parseInt(digits.slice(4), 10);
    const yyyy = inferCentury(yy);
    return makeDate(yyyy, mm, dd);
  }

  // 5 digits: heuristic MM D YY — first 2 = MM, next 1 = D, last 2 = YY
  if (digits.length === 5) {
    const mm = parseInt(digits.slice(0, 2), 10);
    const dd = parseInt(digits.slice(2, 3), 10);
    const yy = parseInt(digits.slice(3), 10);
    const yyyy = inferCentury(yy);
    return makeDate(yyyy, mm, dd);
  }

  return null;
}
