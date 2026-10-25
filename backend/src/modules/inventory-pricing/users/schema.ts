import { z } from 'zod';

/**
 * Param :id cho PATCH /users/:id/password — uuid (theo pattern items itemIdParamsSchema).
 */
export const userIdParamsSchema = z.object({
  id: z.string().uuid('id không hợp lệ'),
});

export type UserIdParams = z.infer<typeof userIdParamsSchema>;
