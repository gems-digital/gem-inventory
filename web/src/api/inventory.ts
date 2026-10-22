import { apiRequest } from './client';
import type { Item, ProductType } from './types';

export interface ItemsQuery {
  productType?: ProductType | null;
  q?: string;
  signal?: AbortSignal;
}

/** GET /inventory/items?product_type=&q= → Item[] (margin tính sẵn). */
export function fetchItems({ productType, q, signal }: ItemsQuery = {}): Promise<Item[]> {
  const params = new URLSearchParams();
  if (productType) params.set('product_type', productType);
  if (q && q.trim()) params.set('q', q.trim());
  const qs = params.toString();
  return apiRequest<Item[]>(`/inventory/items${qs ? `?${qs}` : ''}`, {
    auth: true,
    signal,
  });
}

/** GET /inventory/items/:id → Item (dùng cho màn chi tiết slice sau). */
export function fetchItem(id: string, signal?: AbortSignal): Promise<Item> {
  return apiRequest<Item>(`/inventory/items/${encodeURIComponent(id)}`, {
    auth: true,
    signal,
  });
}
