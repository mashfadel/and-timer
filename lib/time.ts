export const MAX_SECONDS = 99 * 60 + 59; // 99:59 — the display never overflows.
export const MIN_SECONDS = 1;

export function clampSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return MIN_SECONDS;
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(seconds)));
}

/** MM:SS, zero-padded, always the same width so the numerals never shift. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/** “5 min”, “90 min”, “1 h 30 min” — for setup summaries, not the big clock. */
export function human(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}
