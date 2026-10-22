import type { Pool } from 'pg';
import type { InventoryItemRow, ItemFilters } from './types.js';
import type { ItemInput, ItemUpdateInput } from './schema.js';
import { DuplicateItemCodeError } from './errors.js';

const SELECT_COLUMNS = `
  id, code, name, item_kind, product_type, jade_type, color, size, menh, note,
  photo_urls, quantity, cost_price_vnd, sale_price_vnd, floor_price_vnd,
  dimensions, treatment, transparency, origin, weight_gram, certificate_code,
  created_at, updated_at
`;

interface UniqueViolation {
  code: string;
}

function isUniqueViolation(error: unknown): error is UniqueViolation {
  return typeof error === 'object' && error !== null && 'code' in error && (error as UniqueViolation).code === '23505';
}

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

    async findByCode(code: string): Promise<InventoryItemRow | null> {
      const result = await pool.query<InventoryItemRow>(
        `SELECT ${SELECT_COLUMNS} FROM inventory_item WHERE code = $1`,
        [code],
      );
      return result.rows[0] ?? null;
    },

    async create(input: ItemInput, createdByUserId: string): Promise<InventoryItemRow> {
      try {
        const result = await pool.query<InventoryItemRow>(
          `INSERT INTO inventory_item (
             code, name, item_kind, product_type, jade_type, color, size, menh, note,
             photo_urls, quantity, cost_price_vnd, sale_price_vnd, floor_price_vnd,
             dimensions, treatment, transparency, origin, weight_gram, certificate_code,
             created_by, updated_by
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$21)
           RETURNING ${SELECT_COLUMNS}`,
          [
            input.code,
            input.name ?? null,
            input.itemKind,
            input.productType,
            input.jadeType ?? null,
            input.color ?? null,
            input.size ?? null,
            input.menh ?? [],
            input.note ?? null,
            input.photoUrls,
            input.quantity,
            input.costPriceVnd,
            input.salePriceVnd,
            input.floorPriceVnd,
            input.dimensions ?? null,
            input.treatment ?? null,
            input.transparency ?? null,
            input.origin ?? null,
            input.weightGram ?? null,
            input.certificateCode ?? null,
            createdByUserId,
          ],
        );
        const row = result.rows[0];
        if (!row) {
          throw new Error('INSERT inventory_item không trả về dòng nào');
        }
        return row;
      } catch (error) {
        if (isUniqueViolation(error)) {
          // Race condition hiếm: 2 request cùng tạo 1 mã giữa lúc service check và INSERT.
          throw new DuplicateItemCodeError(input.code);
        }
        throw error;
      }
    },

    async update(id: string, input: ItemUpdateInput, updatedByUserId: string): Promise<InventoryItemRow | null> {
      const fields: Array<[string, unknown]> = [];

      if (input.code !== undefined) fields.push(['code', input.code]);
      if (input.name !== undefined) fields.push(['name', input.name]);
      if (input.itemKind !== undefined) fields.push(['item_kind', input.itemKind]);
      if (input.productType !== undefined) fields.push(['product_type', input.productType]);
      if (input.jadeType !== undefined) fields.push(['jade_type', input.jadeType]);
      if (input.color !== undefined) fields.push(['color', input.color]);
      if (input.size !== undefined) fields.push(['size', input.size]);
      if (input.menh !== undefined) fields.push(['menh', input.menh]);
      if (input.note !== undefined) fields.push(['note', input.note]);
      if (input.photoUrls !== undefined) fields.push(['photo_urls', input.photoUrls]);
      if (input.quantity !== undefined) fields.push(['quantity', input.quantity]);
      if (input.costPriceVnd !== undefined) fields.push(['cost_price_vnd', input.costPriceVnd]);
      if (input.salePriceVnd !== undefined) fields.push(['sale_price_vnd', input.salePriceVnd]);
      if (input.floorPriceVnd !== undefined) fields.push(['floor_price_vnd', input.floorPriceVnd]);
      if (input.dimensions !== undefined) fields.push(['dimensions', input.dimensions]);
      if (input.treatment !== undefined) fields.push(['treatment', input.treatment]);
      if (input.transparency !== undefined) fields.push(['transparency', input.transparency]);
      if (input.origin !== undefined) fields.push(['origin', input.origin]);
      if (input.weightGram !== undefined) fields.push(['weight_gram', input.weightGram]);
      if (input.certificateCode !== undefined) fields.push(['certificate_code', input.certificateCode]);

      const params: unknown[] = [];
      const setClauses = fields.map(([column, value]) => {
        params.push(value);
        return `${column} = $${params.length}`;
      });

      params.push(updatedByUserId);
      setClauses.push(`updated_by = $${params.length}`);
      setClauses.push('updated_at = now()');

      params.push(id);
      try {
        const result = await pool.query<InventoryItemRow>(
          `UPDATE inventory_item SET ${setClauses.join(', ')} WHERE id = $${params.length}
           RETURNING ${SELECT_COLUMNS}`,
          params,
        );
        return result.rows[0] ?? null;
      } catch (error) {
        if (isUniqueViolation(error) && typeof input.code === 'string') {
          throw new DuplicateItemCodeError(input.code);
        }
        throw error;
      }
    },
  };
}

export type ItemsRepository = ReturnType<typeof createItemsRepository>;
