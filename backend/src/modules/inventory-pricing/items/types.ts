/**
 * Kiểu dùng chung cho module items (xem BUILD.md §Kiểu Item).
 */

export type ItemKind = 'unique' | 'batch';
export type ProductType = 'ring' | 'bracelet' | 'beads' | 'pendant';

export type Treatment = 'A' | 'B' | 'C' | 'BC';
export type Transparency = 'opaque' | 'semi' | 'translucent' | 'ice' | 'glassy';
export type Origin = 'myanmar' | 'china' | 'vietnam' | 'other';

/**
 * Kích thước có cấu trúc theo productType (BUILD.md §Slice 5). Mọi field bên
 * trong optional — số đo mm trừ khi ghi khác ("ly" UI = 1mm, map 1:1).
 */
export interface RingDimensions {
  ringSizeVn?: number;
  innerDiameterMm?: number;
  faceWidthMm?: number;
  faceLengthMm?: number;
  setting?: 'silver' | 'plated' | 'alloy' | 'gold' | 'stone';
}

export interface BraceletDimensions {
  innerDiameterMm?: number;
  widthMm?: number;
  thicknessMm?: number;
  crossSection?: 'round' | 'flat' | 'bamboo' | 'oval';
  innerShape?: 'round' | 'oval';
}

export interface BeadsDimensions {
  beadDiameterMm?: number;
  beadCount?: number;
  lengthCm?: number;
  beadShape?: 'round' | 'cylinder' | 'other';
  accessories?: string;
}

export interface PendantDimensions {
  lengthMm?: number;
  widthMm?: number;
  thicknessMm?: number;
  motif?: string;
  hasBail?: boolean;
  bail?: string;
}

export type Dimensions = RingDimensions | BraceletDimensions | BeadsDimensions | PendantDimensions;

export interface InventoryItemRow {
  id: string;
  code: string;
  name: string | null;
  item_kind: ItemKind;
  product_type: ProductType;
  jade_type: string | null;
  color: string | null;
  size: string | null;
  menh: string[] | null;
  note: string | null;
  photo_urls: string[];
  quantity: number;
  cost_price_vnd: string; // bigint → trả về dạng string từ node-pg
  sale_price_vnd: string;
  floor_price_vnd: string;
  dimensions: Record<string, unknown> | null; // jsonb → node-pg trả object sẵn
  treatment: Treatment | null;
  transparency: Transparency | null;
  origin: Origin | null;
  weight_gram: string | null; // numeric → trả dạng string từ node-pg
  certificate_code: string | null;
  created_at: string;
  updated_at: string;
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
  costPriceVnd: number;
  salePriceVnd: number;
  floorPriceVnd: number;
  marginVnd: number;
  marginPct: number;
  belowFloorWarn: boolean;
  dimensions: Dimensions | null;
  treatment: Treatment | null;
  transparency: Transparency | null;
  origin: Origin | null;
  weightGram: number | null;
  certificateCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItemFilters {
  productType?: ProductType;
  menh?: string[];
  q?: string;
}
