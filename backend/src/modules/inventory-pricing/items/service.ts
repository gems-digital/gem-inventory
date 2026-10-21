import type { ItemsRepository } from './repository.js';
import { toItem } from './mapper.js';
import type { Item, ItemFilters } from './types.js';
import type { ItemInput, ItemUpdateInput } from './schema.js';
import { ItemNotFoundError, DuplicateItemCodeError } from './errors.js';

export { ItemNotFoundError, DuplicateItemCodeError };

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

      const row = await repository.update(id, input, updatedByUserId);
      if (!row) {
        throw new ItemNotFoundError();
      }
      return toItem(row);
    },
  };
}

export type ItemsService = ReturnType<typeof createItemsService>;
