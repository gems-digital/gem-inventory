import { apiRequest, ApiError } from './client';
import type { AllowedPhotoType, SignedPhoto } from './types';

const ALLOWED: Record<string, AllowedPhotoType> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/png': 'image/png',
  'image/webp': 'image/webp',
};

/** Content-type hợp lệ để gửi presign (chuẩn hoá jpg→jpeg). Null nếu không hỗ trợ. */
export function normalizePhotoType(type: string): AllowedPhotoType | null {
  return ALLOWED[type.toLowerCase()] ?? null;
}

/** POST /inventory/photos/sign — xin URL ký trước cho từng file (theo thứ tự). */
export function signPhotos(contentTypes: AllowedPhotoType[]): Promise<SignedPhoto[]> {
  return apiRequest<SignedPhoto[]>('/inventory/photos/sign', {
    method: 'POST',
    body: { files: contentTypes.map((contentType) => ({ contentType })) },
    auth: true,
  });
}

/**
 * Upload các File cục bộ: presign → PUT thẳng lên object storage (MinIO) →
 * trả publicUrl theo đúng thứ tự đầu vào. Validate content-type trước khi ký.
 */
export async function uploadPhotos(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];

  const types: AllowedPhotoType[] = [];
  for (const file of files) {
    const t = normalizePhotoType(file.type);
    if (!t) {
      throw new ApiError(
        'Định dạng ảnh không hỗ trợ (chỉ JPG, PNG, WEBP). Vui lòng chọn ảnh khác.',
        0,
      );
    }
    types.push(t);
  }

  const signed = await signPhotos(types);
  if (signed.length !== files.length) {
    throw new ApiError('Máy chủ trả số URL ký không khớp số ảnh. Vui lòng thử lại.', 0);
  }

  await Promise.all(
    files.map(async (file, i) => {
      let res: Response;
      try {
        res = await fetch(signed[i].uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': types[i] },
          body: file,
        });
      } catch {
        throw new ApiError('Không tải được ảnh lên kho ảnh (lỗi mạng/CORS). Vui lòng thử lại.', 0);
      }
      if (!res.ok) {
        throw new ApiError(`Tải ảnh thất bại (mã ${res.status}). Vui lòng thử lại.`, res.status);
      }
    }),
  );

  return signed.map((s) => s.publicUrl);
}
