import { apiRequest } from './client';
import type { Item, ItemInput, ProductType } from './types';

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

/** GET /inventory/items/:id → Item. */
export function fetchItem(id: string, signal?: AbortSignal): Promise<Item> {
  return apiRequest<Item>(`/inventory/items/${encodeURIComponent(id)}`, {
    auth: true,
    signal,
  });
}

/** POST /inventory/items → 201 Item. Mã trùng → ApiError(status 409). */
export function createItem(input: ItemInput): Promise<Item> {
  return apiRequest<Item>('/inventory/items', {
    method: 'POST',
    body: input,
    auth: true,
  });
}

/** PATCH /inventory/items/:id → Item. Mã trùng → ApiError(status 409). */
export function updateItem(id: string, input: ItemInput): Promise<Item> {
  return apiRequest<Item>(`/inventory/items/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
    auth: true,
  });
}
