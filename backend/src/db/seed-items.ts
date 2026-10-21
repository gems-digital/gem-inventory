import type { Pool } from 'pg';
import type { ItemKind, ProductType } from '../modules/inventory-pricing/items/types.js';

interface SeedItem {
  code: string;
  name: string;
  itemKind: ItemKind;
  productType: ProductType;
  jadeType: string;
  color: string;
  size: string | null;
  menh: string[];
  note: string | null;
  photoUrls: string[];
  quantity: number;
  costPriceVnd: number;
  salePriceVnd: number;
  floorPriceVnd: number;
}

/**
 * 5 món mẫu khớp demo UI (band giá 500k–5tr VND). MD-073 cố tình đặt sát sàn
 * (<10% dư địa) để test belowFloorWarn. Idempotent — upsert theo code.
 */
function getSeedItems(): SeedItem[] {
  return [
    {
      code: 'VX-001',
      name: 'Vòng cẩm thạch xanh',
      itemKind: 'batch',
      productType: 'bracelet',
      jadeType: 'Cẩm thạch',
      color: 'Xanh',
      size: '16',
      menh: ['Moc', 'Thuy'],
      note: null,
      photoUrls: ['https://picsum.photos/seed/vx-001/600'],
      quantity: 5,
      costPriceVnd: 1_200_000,
      salePriceVnd: 2_200_000,
      floorPriceVnd: 1_600_000,
    },
    {
      code: 'NH-014',
      name: 'Nhẫn phỉ thúy',
      itemKind: 'unique',
      productType: 'ring',
      jadeType: 'Phỉ thúy',
      color: 'Lục',
      size: '7',
      menh: ['Moc'],
      note: null,
      photoUrls: ['https://picsum.photos/seed/nh-014/600'],
      quantity: 1,
      costPriceVnd: 1_800_000,
      salePriceVnd: 3_500_000,
      floorPriceVnd: 2_800_000,
    },
    {
      code: 'MD-073',
      name: 'Mặt dây Quan Âm',
      itemKind: 'unique',
      productType: 'pendant',
      jadeType: 'Cẩm thạch',
      color: 'Trắng xanh',
      size: null,
      menh: ['Tho'],
      note: 'Sát sàn — ưu tiên xả hàng',
      photoUrls: ['https://picsum.photos/seed/md-073/600'],
      quantity: 1,
      costPriceVnd: 900_000,
      salePriceVnd: 1_500_000,
      floorPriceVnd: 1_400_000,
    },
    {
      code: 'CH-220',
      name: 'Chuỗi huyết long',
      itemKind: 'batch',
      productType: 'beads',
      jadeType: 'Huyết long',
      color: 'Đỏ đen',
      size: '8mm',
      menh: ['Hoa'],
      note: null,
      photoUrls: ['https://picsum.photos/seed/ch-220/600'],
      quantity: 10,
      costPriceVnd: 600_000,
      salePriceVnd: 1_100_000,
      floorPriceVnd: 850_000,
    },
    {
      code: 'VX-045',
      name: 'Vòng tỳ hưu',
      itemKind: 'batch',
      productType: 'bracelet',
      jadeType: 'Cẩm thạch',
      color: 'Vàng đất',
      size: '18',
      menh: ['Kim', 'Tho'],
      note: null,
      photoUrls: ['https://picsum.photos/seed/vx-045/600'],
      quantity: 3,
      costPriceVnd: 1_500_000,
      salePriceVnd: 2_800_000,
      floorPriceVnd: 2_000_000,
    },
  ];
}

export async function seedItems(pool: Pool, createdByUserId: string | null): Promise<SeedItem[]> {
  const items = getSeedItems();

  for (const item of items) {
    await pool.query(
      `INSERT INTO inventory_item (
         code, name, item_kind, product_type, jade_type, color, size, menh, note,
         photo_urls, quantity, cost_price_vnd, sale_price_vnd, floor_price_vnd, created_by, updated_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15)
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         item_kind = EXCLUDED.item_kind,
         product_type = EXCLUDED.product_type,
         jade_type = EXCLUDED.jade_type,
         color = EXCLUDED.color,
         size = EXCLUDED.size,
         menh = EXCLUDED.menh,
         note = EXCLUDED.note,
         photo_urls = EXCLUDED.photo_urls,
         quantity = EXCLUDED.quantity,
         cost_price_vnd = EXCLUDED.cost_price_vnd,
         sale_price_vnd = EXCLUDED.sale_price_vnd,
         floor_price_vnd = EXCLUDED.floor_price_vnd,
         updated_at = now()`,
      [
        item.code,
        item.name,
        item.itemKind,
        item.productType,
        item.jadeType,
        item.color,
        item.size,
        item.menh,
        item.note,
        item.photoUrls,
        item.quantity,
        item.costPriceVnd,
        item.salePriceVnd,
        item.floorPriceVnd,
        createdByUserId,
      ],
    );
  }

  return items;
}
