/**
 * Normalize text for case-insensitive, locale-aware search.
 * - Lowercases English letters
 * - Trims surrounding whitespace and collapses inner whitespace
 * - Converts Persian/Arabic digits to ASCII digits
 * - Unifies common Arabic/Persian letter variants (ي→ی, ك→ک, ة→ه)
 * - Strips Arabic diacritics (tashkeel)
 */
export function normalizeSearch(input: unknown): string {
  if (input === null || input === undefined) return "";
  let s = String(input);
  // Persian digits ۰-۹ → 0-9
  s = s.replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  // Arabic digits ٠-٩ → 0-9
  s = s.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  // Letter unification
  s = s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/ة/g, "ه");
  // Remove Arabic diacritics (tashkeel) U+064B..U+0652, U+0670
  s = s.replace(/[\u064B-\u0652\u0670]/g, "");
  // Collapse whitespace + lowercase + trim
  s = s.replace(/\s+/g, " ").trim().toLowerCase();
  return s;
}

/** True if `needle` appears inside `haystack` after normalization. */
export function matchesSearch(haystack: unknown, needle: string): boolean {
  const n = normalizeSearch(needle);
  if (!n) return true;
  return normalizeSearch(haystack).includes(n);
}
