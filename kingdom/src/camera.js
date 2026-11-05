export function stepZoom(current, direction) {
  const percent = Math.round(current * 10) * 10 + Math.sign(direction) * 10;
  return Math.max(40, Math.min(180, percent)) / 100;
}
