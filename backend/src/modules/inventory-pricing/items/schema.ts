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
