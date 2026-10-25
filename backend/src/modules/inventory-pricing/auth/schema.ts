import { z } from 'zod';

export const loginBodySchema = z.object({
  username: z.string().min(1, 'username là bắt buộc'),
  password: z.string().min(1, 'password là bắt buộc'),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

/**
 * Đổi MK tự phục vụ (PATCH /auth/password): cần MK hiện tại + MK mới ≥ 8 ký tự (spec D5).
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mật khẩu hiện tại là bắt buộc'),
  newPassword: z.string().min(8, 'Mật khẩu mới tối thiểu 8 ký tự'),
});

export type ChangePasswordBody = z.infer<typeof changePasswordSchema>;

/**
 * Owner reset MK cho user khác (PATCH /users/:id/password): chỉ cần MK mới ≥ 8 ký tự.
 */
export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Mật khẩu mới tối thiểu 8 ký tự'),
});

export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
