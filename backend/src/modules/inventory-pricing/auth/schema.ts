import { z } from 'zod';

export const loginBodySchema = z.object({
  username: z.string().min(1, 'username là bắt buộc'),
  password: z.string().min(1, 'password là bắt buộc'),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
