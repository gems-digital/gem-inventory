/**
 * Kiểu dùng chung cho module items (xem BUILD.md §Kiểu Item).
 */

export type ItemKind = 'unique' | 'batch';
export type ProductType = 'ring' | 'bracelet' | 'beads' | 'pendant';

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
  createdAt: string;
  updatedAt: string;
}

export interface ItemFilters {
  productType?: ProductType;
  menh?: string[];
  q?: string;
}
