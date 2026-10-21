import type { ItemsRepository } from './repository.js';
import { toItem } from './mapper.js';
import type { Item, ItemFilters } from './types.js';

export class ItemNotFoundError extends Error {
  constructor() {
    super('Không tìm thấy món hàng');
  }
}

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
  };
}

export type ItemsService = ReturnType<typeof createItemsService>;
