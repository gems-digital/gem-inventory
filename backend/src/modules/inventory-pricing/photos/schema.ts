import { z } from 'zod';

/**
 * Danh sách content-type ảnh được chấp nhận upload — khớp đuôi file suy ra ở mapper.ts.
 */
export const ALLOWED_CONTENT_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type AllowedContentType = keyof typeof ALLOWED_CONTENT_TYPES;

const contentTypeSchema = z.enum(
  Object.keys(ALLOWED_CONTENT_TYPES) as [AllowedContentType, ...AllowedContentType[]],
);

export const signPhotosBodySchema = z.object({
  files: z
    .array(z.object({ contentType: contentTypeSchema }))
    .min(1, 'cần ít nhất 1 ảnh')
    .max(8, 'tối đa 8 ảnh'),
});

export type SignPhotosBody = z.infer<typeof signPhotosBodySchema>;
