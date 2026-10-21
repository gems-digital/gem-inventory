import { z } from 'zod';

const productTypeSchema = z.enum(['ring', 'bracelet', 'beads', 'pendant']);

/**
 * Query string ?product_type=&menh=&q= — menh có thể lặp lại (menh=Kim&menh=Moc)
 * hoặc truyền chuỗi phân tách bằng dấu phẩy (menh=Kim,Moc).
 */
export const listItemsQuerySchema = z.object({
  product_type: productTypeSchema.optional(),
  menh: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }
      const values = Array.isArray(value) ? value : value.split(',');
      const trimmed = values.map((v) => v.trim()).filter((v) => v.length > 0);
      return trimmed.length > 0 ? trimmed : undefined;
    }),
  q: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;

export const itemIdParamsSchema = z.object({
  id: z.string().uuid('id không hợp lệ'),
});

const menhEnum = z.enum(['Kim', 'Moc', 'Thuy', 'Hoa', 'Tho']);
const nonNegativeBigint = z.number().int().min(0, 'phải >= 0');

/**
 * ItemInput — body cho POST /inventory/items (BUILD.md §API contract).
 */
export const itemInputSchema = z.object({
  code: z.string().trim().min(1, 'code là bắt buộc'),
  name: z.string().trim().min(1).nullable().optional(),
  itemKind: z.enum(['unique', 'batch']),
  productType: productTypeSchema,
  jadeType: z.string().trim().min(1).nullable().optional(),
  color: z.string().trim().min(1).nullable().optional(),
  size: z.string().trim().min(1).nullable().optional(),
  menh: z.array(menhEnum).max(5).optional().default([]),
  note: z.string().trim().min(1).nullable().optional(),
  photoUrls: z.array(z.string().url()).min(1, 'cần ít nhất 1 ảnh').max(8, 'tối đa 8 ảnh'),
  quantity: z.number().int().min(0).default(0),
  costPriceVnd: nonNegativeBigint,
  salePriceVnd: nonNegativeBigint,
  floorPriceVnd: nonNegativeBigint,
});

export type ItemInput = z.infer<typeof itemInputSchema>;

/**
 * ItemUpdateInput — body cho PATCH /inventory/items/:id, mọi field tùy chọn (partial update).
 */
export const itemUpdateSchema = itemInputSchema.partial();

export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;
