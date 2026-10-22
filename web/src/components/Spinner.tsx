interface SpinnerProps {
  size?: number;
  color?: string;
  stroke?: number;
}

/** Vòng xoay loading nhẹ, màu jade mặc định. */
export function Spinner({ size = 28, color = 'var(--jade)', stroke = 3 }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Đang tải"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `${stroke}px solid color-mix(in srgb, ${color} 25%, transparent)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'omnigem-spin 0.7s linear infinite',
      }}
    />
  );
}
