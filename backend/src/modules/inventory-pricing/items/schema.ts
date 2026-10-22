import { z } from 'zod';
import type { ProductType } from './types.js';

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
 * Slice 5 — kích thước có cấu trúc theo productType + đặc điểm chung (BUILD.md §Slice 5).
 * Mã ASCII (gửi lên API); UI tự map sang nhãn tiếng Việt.
 */
const ringDimensionsSchema = z
  .object({
    ringSizeVn: z.number().int().optional(),
    innerDiameterMm: z.number().optional(),
    faceWidthMm: z.number().optional(),
    faceLengthMm: z.number().optional(),
    setting: z.enum(['silver', 'plated', 'alloy', 'gold', 'stone']).optional(),
  })
  .strict();

const braceletDimensionsSchema = z
  .object({
    innerDiameterMm: z.number().optional(),
    widthMm: z.number().optional(),
    thicknessMm: z.number().optional(),
    crossSection: z.enum(['round', 'flat', 'bamboo', 'oval']).optional(),
    innerShape: z.enum(['round', 'oval']).optional(),
  })
  .strict();

const beadsDimensionsSchema = z
  .object({
    beadDiameterMm: z.number().optional(),
    beadCount: z.number().int().optional(),
    lengthCm: z.number().optional(),
    beadShape: z.enum(['round', 'cylinder', 'other']).optional(),
    accessories: z.string().trim().min(1).optional(),
  })
  .strict();

const pendantDimensionsSchema = z
  .object({
    lengthMm: z.number().optional(),
    widthMm: z.number().optional(),
    thicknessMm: z.number().optional(),
    motif: z.string().trim().min(1).optional(),
    hasBail: z.boolean().optional(),
    bail: z.string().trim().min(1).optional(),
  })
  .strict();

const dimensionsSchemaByProductType: Record<ProductType, z.ZodTypeAny> = {
  ring: ringDimensionsSchema,
  bracelet: braceletDimensionsSchema,
  beads: beadsDimensionsSchema,
  pendant: pendantDimensionsSchema,
};

/**
 * Validate `dimensions` theo productType — dùng cả ở schema create (productType luôn có)
 * và ở service.updateItem (productType suy từ item hiện tại khi PATCH không gửi lại).
 */
export function validateDimensionsForProductType(productType: ProductType, dimensions: unknown) {
  return dimensionsSchemaByProductType[productType].safeParse(dimensions);
}

const treatmentEnum = z.enum(['A', 'B', 'C', 'BC']);
const transparencyEnum = z.enum(['opaque', 'semi', 'translucent', 'ice', 'glassy']);
const originEnum = z.enum(['myanmar', 'china', 'vietnam', 'other']);

/**
 * Trường chung cho ItemInput/ItemUpdateInput (chưa gồm validate dimensions theo
 * productType — cái đó ở superRefine riêng cho create, và ở service cho update).
 */
const itemBaseObjectSchema = z.object({
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
  // Slice 5 — tất cả optional, không phá item cũ.
  dimensions: z.record(z.string(), z.unknown()).optional(),
  treatment: treatmentEnum.optional(),
  transparency: transparencyEnum.optional(),
  origin: originEnum.optional(),
  weightGram: z.number().nonnegative().optional(),
  certificateCode: z.string().trim().min(1).optional(),
});

/**
 * ItemInput — body cho POST /inventory/items (BUILD.md §API contract). productType
 * luôn có mặt ở create, nên validate dimensions theo đúng loại ngay tại schema.
 */
export const itemInputSchema = itemBaseObjectSchema.superRefine((data, ctx) => {
  if (data.dimensions !== undefined) {
    const result = validateDimensionsForProductType(data.productType, data.dimensions);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ['dimensions', ...issue.path] });
      }
    }
  }
});

export type ItemInput = z.infer<typeof itemBaseObjectSchema>;

/**
 * ItemUpdateInput — body cho PATCH /inventory/items/:id, mọi field tùy chọn (partial update).
 * KHÔNG validate dimensions ở đây vì productType có thể không được gửi lại khi PATCH —
 * service.updateItem tự suy productType từ item hiện tại rồi validate.
 */
export const itemUpdateSchema = itemBaseObjectSchema.partial();

export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;
