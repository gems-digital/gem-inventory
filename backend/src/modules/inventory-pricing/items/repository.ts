import type { Pool } from 'pg';
import type { InventoryItemRow, ItemFilters } from './types.js';

const SELECT_COLUMNS = `
  id, code, name, item_kind, product_type, jade_type, color, size, menh, note,
  photo_urls, quantity, cost_price_vnd, sale_price_vnd, floor_price_vnd,
  created_at, updated_at
`;

/**
 * Truy cập Postgres cho bảng inventory_item. Không chứa logic nghiệp vụ (margin tính ở service.ts).
 */
export function createItemsRepository(pool: Pool) {
  return {
    async findAll(filters: ItemFilters): Promise<InventoryItemRow[]> {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (filters.productType) {
        params.push(filters.productType);
        conditions.push(`product_type = $${params.length}`);
      }

      if (filters.menh && filters.menh.length > 0) {
        params.push(filters.menh);
        conditions.push(`menh && $${params.length}::text[]`);
      }

      if (filters.q) {
        params.push(`%${filters.q}%`);
        conditions.push(`(code ILIKE $${params.length} OR name ILIKE $${params.length})`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query<InventoryItemRow>(
        `SELECT ${SELECT_COLUMNS} FROM inventory_item ${where} ORDER BY created_at DESC`,
        params,
      );
      return result.rows;
    },

    async findById(id: string): Promise<InventoryItemRow | null> {
      const result = await pool.query<InventoryItemRow>(
        `SELECT ${SELECT_COLUMNS} FROM inventory_item WHERE id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    },
  };
}

export type ItemsRepository = ReturnType<typeof createItemsRepository>;
