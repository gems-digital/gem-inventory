import type { Dimensions, ProductType } from '../api/types';

/** Bộ lọc loại SP: apiValue null = "Tất cả". */
export interface ProductTypeFilter {
  key: string;
  label: string;
  apiValue: ProductType | null;
}

export const PRODUCT_TYPE_FILTERS: ProductTypeFilter[] = [
  { key: 'all', label: 'Tất cả', apiValue: null },
  { key: 'ring', label: 'Nhẫn', apiValue: 'ring' },
  { key: 'bracelet', label: 'Vòng', apiValue: 'bracelet' },
  { key: 'beads', label: 'Chuỗi', apiValue: 'beads' },
  { key: 'pendant', label: 'Mặt dây', apiValue: 'pendant' },
];

export function productTypeLabel(value: string): string {
  switch (value) {
    case 'ring':
      return 'Nhẫn';
    case 'bracelet':
      return 'Vòng';
    case 'beads':
      return 'Chuỗi hạt';
    case 'pendant':
      return 'Mặt dây';
    default:
      return value;
  }
}

export function itemKindLabel(value: string): string {
  switch (value) {
    case 'unique':
      return 'Độc bản';
    case 'batch':
      return 'Hàng loạt';
    default:
      return value;
  }
}

const MENH_LABELS: Record<string, string> = {
  Kim: 'Kim',
  Moc: 'Mộc',
  Thuy: 'Thủy',
  Hoa: 'Hỏa',
  Tho: 'Thổ',
};
export function menhLabel(value: string): string {
  return MENH_LABELS[value] ?? value;
}

export function roleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Quản trị';
    case 'staff':
      return 'Nhân viên';
    default:
      return role;
  }
}

function numText(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return Number.isInteger(value) ? String(value) : String(value);
}

/**
 * Chuỗi size gọn suy từ dimensions theo productType, vd "ĐK trong 56 · bản 12mm".
 * Null khi không có gì để hiển thị (fallback về size text cũ ở nơi gọi).
 */
export function dimensionsSummary(productType: string, dim: Dimensions | null): string | null {
  if (!dim) return null;
  let parts: (string | null)[] = [];
  switch (productType) {
    case 'ring':
      parts = [
        numText(dim.ringSizeVn) && `ni ${numText(dim.ringSizeVn)}`,
        numText(dim.innerDiameterMm) && `ĐK trong ${numText(dim.innerDiameterMm)}`,
        numText(dim.faceWidthMm) && `bản ${numText(dim.faceWidthMm)}mm`,
      ];
      break;
    case 'bracelet':
      parts = [
        numText(dim.innerDiameterMm) && `ĐK trong ${numText(dim.innerDiameterMm)}`,
        numText(dim.widthMm) && `bản ${numText(dim.widthMm)}mm`,
        numText(dim.thicknessMm) && `dày ${numText(dim.thicknessMm)}mm`,
      ];
      break;
    case 'beads':
      parts = [
        numText(dim.beadDiameterMm) && `hạt ${numText(dim.beadDiameterMm)}mm`,
        dim.beadCount ? `${dim.beadCount} hạt` : null,
        numText(dim.lengthCm) && `dài ${numText(dim.lengthCm)}cm`,
      ];
      break;
    case 'pendant': {
      const l = numText(dim.lengthMm);
      const w = numText(dim.widthMm);
      const t = numText(dim.thicknessMm);
      parts = [l && w ? `${l}×${w}${t ? `×${t}` : ''}mm` : null];
      break;
    }
    default:
      parts = [];
  }
  const filtered = parts.filter((p): p is string => Boolean(p));
  return filtered.length > 0 ? filtered.join(' · ') : null;
}

/** Tag pills cho thẻ hàng: loại · ngọc · size (dimensions, fallback size cũ). */
export function buildTags(item: {
  productType: string;
  jadeType: string | null;
  dimensions: Dimensions | null;
  size: string | null;
}): string[] {
  const sizeStr = dimensionsSummary(item.productType, item.dimensions) ?? item.size?.trim() ?? null;
  return [productTypeLabel(item.productType), item.jadeType?.trim() || null, sizeStr || null].filter(
    (t): t is string => Boolean(t),
  );
}
