// Kiểu dữ liệu khớp API contract (BUILD.md). Margin tính sẵn server-side.

export type ItemKind = 'unique' | 'batch';
export type ProductType = 'ring' | 'bracelet' | 'beads' | 'pendant';

/**
 * Dimensions phẳng theo productType — chỉ field của loại tương ứng được điền.
 * Mọi field optional (Slice 5). Số = mm trừ khi ghi khác.
 */
export interface Dimensions {
  // ring
  ringSizeVn?: number;
  innerDiameterMm?: number;
  faceWidthMm?: number;
  faceLengthMm?: number;
  setting?: string; // silver|plated|alloy|gold|stone
  // bracelet
  widthMm?: number;
  thicknessMm?: number;
  crossSection?: string; // round|flat|bamboo|oval
  innerShape?: string; // round|oval
  // beads
  beadDiameterMm?: number;
  beadCount?: number;
  lengthCm?: number;
  beadShape?: string; // round|cylinder|other
  accessories?: string;
  // pendant
  lengthMm?: number;
  motif?: string;
  hasBail?: boolean;
  bail?: string;
}

export interface Item {
  id: string;
  code: string;
  name: string | null;
  itemKind: ItemKind;
  productType: ProductType;
  jadeType: string | null;
  color: string | null;
  size: string | null;
  menh: string[];
  note: string | null;
  photoUrls: string[];
  quantity: number;
  costPriceVnd: number | null;
  salePriceVnd: number;
  floorPriceVnd: number | null;
  marginVnd: number | null;
  marginPct: number | null;
  belowFloorWarn: boolean;
  dimensions: Dimensions | null;
  treatment: string | null;
  transparency: string | null;
  origin: string | null;
  weightGram: number | null;
  certificateCode: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Body cho POST/PATCH item — như Item nhưng bỏ field margin tính server-side. */
export interface ItemInput {
  code: string;
  name?: string | null;
  itemKind: ItemKind;
  productType: ProductType;
  jadeType?: string | null;
  color?: string | null;
  size?: string | null;
  menh: string[];
  note?: string | null;
  photoUrls: string[];
  quantity: number;
  costPriceVnd: number;
  salePriceVnd: number;
  floorPriceVnd: number;
  dimensions?: Record<string, unknown>;
  treatment?: string;
  transparency?: string;
  origin?: string;
  weightGram?: number;
  certificateCode?: string;
}

/** Content-type ảnh backend chấp nhận (photos/sign). */
export type AllowedPhotoType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Một ảnh đã ký: PUT file lên uploadUrl, lưu publicUrl vào photoUrls[]. */
export interface SignedPhoto {
  uploadUrl: string;
  publicUrl: string;
  key?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: string; // staff | admin
}

export interface LoginData {
  token: string;
  user: AuthUser;
}

export interface ListMeta {
  total?: number;
  page?: number;
  limit?: number;
}

/** Envelope chung { success, data?, error?, meta? }. */
export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: ListMeta;
}
