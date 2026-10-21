import { randomUUID } from 'node:crypto';
import { PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../../config/env.js';
import { ALLOWED_CONTENT_TYPES, type AllowedContentType } from './schema.js';

export interface SignedPhoto {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

const SIGNED_URL_EXPIRES_SECONDS = 5 * 60;

function buildKey(contentType: AllowedContentType): string {
  const ext = ALLOWED_CONTENT_TYPES[contentType];
  return `items/${randomUUID()}.${ext}`;
}

function buildPublicUrl(key: string): string {
  return `${env.MINIO_PUBLIC_URL}/${env.MINIO_BUCKET}/${key}`;
}

/**
 * Ký trước URL PUT lên MinIO (S3-compatible) — client upload thẳng, không qua backend.
 * Việc ký diễn ra hoàn toàn cục bộ (không gọi network tới MinIO), nên không cần MinIO
 * đang chạy để test phần này.
 */
export function createPhotosService(s3Client: S3Client) {
  return {
    async signUploads(contentTypes: AllowedContentType[]): Promise<SignedPhoto[]> {
      const signed: SignedPhoto[] = [];

      for (const contentType of contentTypes) {
        const key = buildKey(contentType);
        const command = new PutObjectCommand({
          Bucket: env.MINIO_BUCKET,
          Key: key,
          ContentType: contentType,
        });
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: SIGNED_URL_EXPIRES_SECONDS });

        signed.push({ uploadUrl, publicUrl: buildPublicUrl(key), key });
      }

      return signed;
    },
  };
}

export type PhotosService = ReturnType<typeof createPhotosService>;
