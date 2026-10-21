import type { InventoryItemRow, Item } from './types.js';

const BELOW_FLOOR_THRESHOLD = 0.1;

/**
 * Map row Postgres (snake_case, giá bigint-as-string) → Item response (camelCase).
 * Margin tính lúc đọc — KHÔNG lưu (BUILD.md). Tách riêng để unit test không cần DB.
 */
export function toItem(row: InventoryItemRow): Item {
  const costPriceVnd = Number(row.cost_price_vnd);
  const salePriceVnd = Number(row.sale_price_vnd);
  const floorPriceVnd = Number(row.floor_price_vnd);

  const marginVnd = salePriceVnd - costPriceVnd;
  const marginPct = salePriceVnd > 0 ? marginVnd / salePriceVnd : 0;
  const belowFloorWarn = salePriceVnd > 0 ? (salePriceVnd - floorPriceVnd) / salePriceVnd < BELOW_FLOOR_THRESHOLD : false;

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    itemKind: row.item_kind,
    productType: row.product_type,
    jadeType: row.jade_type,
    color: row.color,
    size: row.size,
    menh: row.menh ?? [],
    note: row.note,
    photoUrls: row.photo_urls,
    quantity: row.quantity,
    costPriceVnd,
    salePriceVnd,
    floorPriceVnd,
    marginVnd,
    marginPct,
    belowFloorWarn,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
