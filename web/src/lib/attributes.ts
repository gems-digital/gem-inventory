import type { Dimensions, ProductType } from '../api/types';

// Bảng enum (apiValue, nhãn VN): GỬI mã ASCII, HIỂN THỊ nhãn — tránh lỗi 400
// diacritics (như vụ mệnh). Khớp Android ui/common/Attributes.kt + BUILD.md Slice 5.
export interface Option {
  value: string;
  label: string;
}

export const SETTING_OPTIONS: Option[] = [
  { value: 'silver', label: 'Ổ bạc' },
  { value: 'plated', label: 'Xi mạ' },
  { value: 'alloy', label: 'Hợp kim' },
  { value: 'gold', label: 'Vàng' },
  { value: 'stone', label: 'Ổ đá' },
];
export const CROSS_SECTION_OPTIONS: Option[] = [
  { value: 'round', label: 'Tròn' },
  { value: 'flat', label: 'Dẹt' },
  { value: 'bamboo', label: 'Trúc' },
  { value: 'oval', label: 'Bầu dục' },
];
export const INNER_SHAPE_OPTIONS: Option[] = [
  { value: 'round', label: 'Tròn' },
  { value: 'oval', label: 'Bầu dục' },
];
export const BEAD_SHAPE_OPTIONS: Option[] = [
  { value: 'round', label: 'Tròn' },
  { value: 'cylinder', label: 'Trụ' },
  { value: 'other', label: 'Khác' },
];
export const TREATMENT_OPTIONS: Option[] = [
  { value: 'A', label: 'A (tự nhiên)' },
  { value: 'B', label: 'B (tẩm)' },
  { value: 'C', label: 'C (nhuộm)' },
  { value: 'BC', label: 'B+C' },
];
export const TRANSPARENCY_OPTIONS: Option[] = [
  { value: 'opaque', label: 'Đục' },
  { value: 'semi', label: 'Bán trong' },
  { value: 'translucent', label: 'Trong' },
  { value: 'ice', label: 'Băng' },
  { value: 'glassy', label: 'Thủy' },
];
export const ORIGIN_OPTIONS: Option[] = [
  { value: 'myanmar', label: 'Myanmar' },
  { value: 'china', label: 'Trung Quốc' },
  { value: 'vietnam', label: 'Việt Nam' },
  { value: 'other', label: 'Khác' },
];

/** Nhãn cho một apiValue; fallback về chính value nếu không khớp. */
export function optionLabel(options: Option[], value: string | null | undefined): string | null {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? value;
}

// --- Dimension field metadata (một nguồn dùng cho CẢ form lẫn detail) ---

export type FieldKind = 'number' | 'int' | 'text' | 'enum' | 'bool';

export interface DimField {
  key: keyof Dimensions;
  label: string;
  kind: FieldKind;
  unit?: string; // hiển thị ở detail (mm/cm/g…)
  options?: Option[]; // cho kind 'enum'
}

const RING_FIELDS: DimField[] = [
  { key: 'ringSizeVn', label: 'Ni nhẫn', kind: 'int' },
  { key: 'innerDiameterMm', label: 'ĐK trong', kind: 'number', unit: 'mm' },
  { key: 'faceWidthMm', label: 'Bản mặt', kind: 'number', unit: 'mm' },
  { key: 'faceLengthMm', label: 'Dài mặt', kind: 'number', unit: 'mm' },
  { key: 'setting', label: 'Ổ / đai', kind: 'enum', options: SETTING_OPTIONS },
];

const BRACELET_FIELDS: DimField[] = [
  { key: 'innerDiameterMm', label: 'ĐK trong', kind: 'number', unit: 'mm' },
  { key: 'widthMm', label: 'Bản', kind: 'number', unit: 'mm' },
  { key: 'thicknessMm', label: 'Độ dày', kind: 'number', unit: 'mm' },
  { key: 'crossSection', label: 'Mặt cắt', kind: 'enum', options: CROSS_SECTION_OPTIONS },
  { key: 'innerShape', label: 'Hình niềng', kind: 'enum', options: INNER_SHAPE_OPTIONS },
];

const BEADS_FIELDS: DimField[] = [
  { key: 'beadDiameterMm', label: 'ĐK hạt', kind: 'number', unit: 'mm' },
  { key: 'beadCount', label: 'Số hạt', kind: 'int', unit: 'hạt' },
  { key: 'lengthCm', label: 'Chiều dài', kind: 'number', unit: 'cm' },
  { key: 'beadShape', label: 'Hình hạt', kind: 'enum', options: BEAD_SHAPE_OPTIONS },
  { key: 'accessories', label: 'Phụ kiện', kind: 'text' },
];

const PENDANT_FIELDS: DimField[] = [
  { key: 'lengthMm', label: 'Dài', kind: 'number', unit: 'mm' },
  { key: 'widthMm', label: 'Rộng', kind: 'number', unit: 'mm' },
  { key: 'thicknessMm', label: 'Dày', kind: 'number', unit: 'mm' },
  { key: 'hasBail', label: 'Có kèm dây/khoen', kind: 'bool' },
  { key: 'motif', label: 'Chủ đề khắc', kind: 'text' },
];

const FIELDS_BY_TYPE: Record<ProductType, DimField[]> = {
  ring: RING_FIELDS,
  bracelet: BRACELET_FIELDS,
  beads: BEADS_FIELDS,
  pendant: PENDANT_FIELDS,
};

export function dimensionFields(productType: ProductType): DimField[] {
  return FIELDS_BY_TYPE[productType] ?? [];
}

/** Giá trị hiển thị (có đơn vị / nhãn enum / Có-Không) cho một field từ dimensions. */
function displayValue(field: DimField, dim: Dimensions): string | null {
  const raw = dim[field.key];
  if (raw === null || raw === undefined || raw === '') return null;
  switch (field.kind) {
    case 'enum':
      return optionLabel(field.options ?? [], String(raw));
    case 'bool':
      return raw ? 'Có' : 'Không';
    case 'number':
    case 'int':
      return field.unit ? `${raw} ${field.unit}` : String(raw);
    default:
      return String(raw);
  }
}

export interface SpecRow {
  label: string;
  value: string;
}

/** Danh sách (nhãn, giá trị) cho các field dimensions có dữ liệu — dùng ở detail. */
export function dimensionRows(productType: ProductType, dim: Dimensions | null): SpecRow[] {
  if (!dim) return [];
  return dimensionFields(productType)
    .map((field) => {
      const value = displayValue(field, dim);
      return value ? { label: field.label, value } : null;
    })
    .filter((row): row is SpecRow => row !== null);
}

/**
 * Dựng payload dimensions để GỬI: CHỈ key của loại đang chọn, bỏ field rỗng,
 * ép kiểu số/bool. Trả undefined khi không có field nào (không gửi field rỗng).
 */
export function buildDimensionsPayload(
  productType: ProductType,
  raw: Record<string, string>,
): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  for (const field of dimensionFields(productType)) {
    const value = raw[field.key]?.trim();
    if (!value) continue;
    switch (field.kind) {
      case 'int': {
        const n = Number.parseInt(value, 10);
        if (Number.isFinite(n)) out[field.key] = n;
        break;
      }
      case 'number': {
        const n = Number.parseFloat(value.replace(',', '.'));
        if (Number.isFinite(n)) out[field.key] = n;
        break;
      }
      case 'bool':
        out[field.key] = value === 'true';
        break;
      default:
        out[field.key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Prefill map chuỗi (cho form) từ dimensions đã lưu. */
export function dimensionsToInputMap(dim: Dimensions | null): Record<string, string> {
  if (!dim) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(dim)) {
    if (value === null || value === undefined) continue;
    out[key] = typeof value === 'boolean' ? String(value) : String(value);
  }
  return out;
}
