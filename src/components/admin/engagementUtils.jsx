export function fmtSeconds(s) {
  if (!s || s < 60) return `${s || 0}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}