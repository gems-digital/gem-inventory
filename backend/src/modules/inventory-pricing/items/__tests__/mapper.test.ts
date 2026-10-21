import { describe, expect, it } from 'vitest';
import { toItem } from '../mapper.js';
import type { InventoryItemRow } from '../types.js';

function makeRow(overrides: Partial<InventoryItemRow> = {}): InventoryItemRow {
  return {
    id: 'item-1',
    code: 'VX-001',
    name: 'Vòng cẩm thạch xanh',
    item_kind: 'batch',
    product_type: 'bracelet',
    jade_type: 'Cẩm thạch',
    color: 'Xanh',
    size: '16',
    menh: ['Moc', 'Thuy'],
    note: null,
    photo_urls: ['https://example.com/a.jpg'],
    quantity: 5,
    cost_price_vnd: '1200000',
    sale_price_vnd: '2200000',
    floor_price_vnd: '1600000',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('toItem mapper (margin tính lúc đọc)', () => {
  it('maps snake_case bigint-as-string rows to camelCase numeric Item', () => {
    const item = toItem(makeRow());

    expect(item.costPriceVnd).toBe(1_200_000);
    expect(item.salePriceVnd).toBe(2_200_000);
    expect(item.floorPriceVnd).toBe(1_600_000);
    expect(item.itemKind).toBe('batch');
    expect(item.productType).toBe('bracelet');
    expect(item.photoUrls).toEqual(['https://example.com/a.jpg']);
  });

  it('computes marginVnd and marginPct as sale - cost', () => {
    const item = toItem(makeRow({ cost_price_vnd: '1200000', sale_price_vnd: '2200000' }));

    expect(item.marginVnd).toBe(1_000_000);
    expect(item.marginPct).toBeCloseTo(1_000_000 / 2_200_000);
  });

  it('sets belowFloorWarn=false when comfortably above floor', () => {
    const item = toItem(makeRow({ sale_price_vnd: '2200000', floor_price_vnd: '1600000' }));
    expect(item.belowFloorWarn).toBe(false);
  });

  it('sets belowFloorWarn=true when within 10% of floor (MD-073 case)', () => {
    const item = toItem(makeRow({ sale_price_vnd: '1500000', floor_price_vnd: '1400000' }));
    // (1.5m - 1.4m) / 1.5m = 0.0667 < 0.10
    expect(item.belowFloorWarn).toBe(true);
  });

  it('defaults menh to empty array when null', () => {
    const item = toItem(makeRow({ menh: null }));
    expect(item.menh).toEqual([]);
  });
});
