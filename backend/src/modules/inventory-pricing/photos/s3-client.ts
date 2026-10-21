import { S3Client } from '@aws-sdk/client-s3';
import { env } from '../../../config/env.js';

/**
 * S3Client cấu hình cho MinIO (path-style, region giả us-east-1 — MinIO không
 * dùng region nhưng SDK S3 yêu cầu có giá trị).
 */
export const s3Client = new S3Client({
  endpoint: env.MINIO_ENDPOINT,
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY,
    secretAccessKey: env.MINIO_SECRET_KEY,
  },
});
