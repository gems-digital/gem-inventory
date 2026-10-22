// Format tiền VND: dấu chấm ngăn nghìn + "đ" (giống app native). Null-safe.
const vndFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/** 1500000 → "1.500.000 đ". Null → "—". */
export function formatVnd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return `${vndFormatter.format(amount)} đ`;
}

/** 0.42 → "42%". Làm tròn phần trăm nguyên. */
export function formatPercent(fraction: number | null | undefined): string {
  if (fraction === null || fraction === undefined) return '—';
  return `${Math.round(fraction * 100)}%`;
}
