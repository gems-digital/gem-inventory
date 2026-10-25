import type { ItemsRepository } from './repository.js';
import { toItem } from './mapper.js';
import type { Item, ItemFilters } from './types.js';
import type { ItemInput, ItemUpdateInput } from './schema.js';
import { validateDimensionsForProductType } from './schema.js';
import { ItemNotFoundError, DuplicateItemCodeError, InvalidDimensionsError } from './errors.js';

export { ItemNotFoundError, DuplicateItemCodeError, InvalidDimensionsError };

export function createItemsService(repository: ItemsRepository) {
  return {
    async listItems(filters: ItemFilters): Promise<{ items: Item[]; total: number }> {
      const rows = await repository.findAll(filters);
      const items = rows.map(toItem);
      return { items, total: items.length };
    },

    async getItemById(id: string): Promise<Item> {
      const row = await repository.findById(id);
      if (!row) {
        throw new ItemNotFoundError();
      }
      return toItem(row);
    },

    async createItem(input: ItemInput, createdByUserId: string): Promise<Item> {
      const existing = await repository.findByCode(input.code);
      if (existing) {
        throw new DuplicateItemCodeError(input.code);
      }

      const row = await repository.create(input, createdByUserId);
      return toItem(row);
    },

    async updateItem(id: string, input: ItemUpdateInput, updatedByUserId: string): Promise<Item> {
      const current = await repository.findById(id);
      if (!current) {
        throw new ItemNotFoundError();
      }

      if (input.code && input.code !== current.code) {
        const existing = await repository.findByCode(input.code);
        if (existing) {
          throw new DuplicateItemCodeError(input.code);
        }
      }

      if (input.dimensions !== undefined) {
        // productType có thể không gửi lại khi PATCH — suy từ item hiện tại.
        const productType = input.productType ?? current.product_type;
        const result = validateDimensionsForProductType(productType, input.dimensions);
        if (!result.success) {
          throw new InvalidDimensionsError();
        }
      }

      const row = await repository.update(id, input, updatedByUserId);
      if (!row) {
        throw new ItemNotFoundError();
      }
      return toItem(row);
    },

    /**
     * Ẩn món (soft delete) — idempotent theo spec UC-06 §4: ẩn một món đã ẩn
     * (hoặc id không tồn tại) vẫn coi là thành công, không ném ItemNotFound.
     * repo.softDelete trả null khi món đã ẩn từ trước hoặc không tồn tại → resolve void.
     */
    async softDeleteItem(id: string, userId: string): Promise<void> {
      await repository.softDelete(id, userId);
    },

    /**
     * Khôi phục món đã ẩn (nút HOÀN TÁC). Khác DELETE: không idempotent —
     * không thể khôi phục món đang hiện / không tồn tại → ItemNotFound (404).
     */
    async restoreItem(id: string): Promise<Item> {
      const row = await repository.restore(id);
      if (!row) {
        throw new ItemNotFoundError();
      }
      return toItem(row);
    },
  };
}

export type ItemsService = ReturnType<typeof createItemsService>;
