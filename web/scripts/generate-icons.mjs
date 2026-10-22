// Sinh icon PWA (jade gem) từ một SVG master → PNG 192/512/512-maskable + apple-touch.
// Chạy: npm run icons. Dùng sharp (devDependency). Nếu sharp lỗi, icon SVG
// (favicon.svg) vẫn dùng được; chỉ PNG home-screen cần script này.
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');

const JADE = '#2E7D5B';
const JADE_DARK = '#246349';
const IVORY = '#F4F2EC';

// Viên kim cương jade: mặt bàn (trapezoid) + các facet, mực trắng ngà trên nền jade.
function gemSvg(size, { maskable = false } = {}) {
  const pad = maskable ? size * 0.14 : size * 0.1; // maskable chừa safe-zone
  const bgRadius = maskable ? 0 : size * 0.22;
  const cx = size / 2;
  const top = pad;
  const girdle = pad + (size - 2 * pad) * 0.34;
  const bottom = size - pad;
  const left = pad;
  const right = size - pad;
  const q = (right - left) * 0.26;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${JADE}"/>
      <stop offset="1" stop-color="${JADE_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${bgRadius}" fill="url(#bg)"/>
  <g fill="none" stroke="${IVORY}" stroke-width="${size * 0.028}" stroke-linejoin="round" stroke-linecap="round">
    <path d="M ${left} ${girdle} L ${left + q} ${top} L ${right - q} ${top} L ${right} ${girdle} L ${cx} ${bottom} Z"/>
    <path d="M ${left} ${girdle} L ${right} ${girdle}"/>
    <path d="M ${left + q} ${top} L ${left + q} ${girdle}"/>
    <path d="M ${right - q} ${top} L ${right - q} ${girdle}"/>
    <path d="M ${left} ${girdle} L ${cx} ${bottom}"/>
    <path d="M ${right} ${girdle} L ${cx} ${bottom}"/>
    <path d="M ${left + q} ${girdle} L ${cx} ${bottom}"/>
    <path d="M ${right - q} ${girdle} L ${cx} ${bottom}"/>
  </g>
</svg>`;
}

async function png(size, opts, name) {
  const buf = Buffer.from(gemSvg(size, opts));
  await sharp(buf).png().toFile(join(publicDir, name));
  console.log('  wrote', name);
}

async function main() {
  await mkdir(publicDir, { recursive: true });
  // favicon vector (dùng cho tab + fallback)
  await writeFile(join(publicDir, 'favicon.svg'), gemSvg(64));
  await png(192, {}, 'icon-192.png');
  await png(512, {}, 'icon-512.png');
  await png(512, { maskable: true }, 'icon-512-maskable.png');
  await png(180, {}, 'apple-touch-icon.png');
  console.log('Icons generated in public/.');
}

main().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
