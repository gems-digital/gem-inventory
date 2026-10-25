// Icon vector (SVG), KHÔNG emoji. currentColor để tô theo context.
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  };
}

/** Viên kim cương jade — dùng cho logo & placeholder ảnh. */
export function GemIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 9 L8 4 L16 4 L19 9 L12 20 Z" />
      <path d="M5 9 H19" />
      <path d="M8 4 L8 9" />
      <path d="M16 4 L16 9" />
      <path d="M8 9 L12 20" />
      <path d="M16 9 L12 20" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 8h3l1.5-2h7L17 8h3a0 0 0 0 1 0 0v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function WarnIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12.5 10 17l9-10" />
    </svg>
  );
}

/** Người trong khung tròn — lối vào màn Tài khoản. */
export function PersonIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 18a6 6 0 0 1 11 0" />
    </svg>
  );
}

/** Mắt gạch chéo — hành động "Ẩn món" (soft delete). */
export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c5 0 9 4 10 7-.4 1.2-1.2 2.5-2.3 3.7M6.3 6.3C4.2 7.6 2.6 9.5 2 12c1 3 5 7 10 7 1.4 0 2.7-.3 3.9-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

/** Ngôi sao — đánh dấu ảnh đại diện. Truyền fill="currentColor" để tô đặc (đang là đại diện). */
export function StarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85-5.25-2.75-5.25 2.75 1-5.85L3.5 9.65l5.9-.85z" />
    </svg>
  );
}
