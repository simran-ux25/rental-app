//src/storage/minioclient.ts
import { Client } from "minio";
import { MINIO_CONFIG } from "../config/minio";

export const minioClient = new Client({
  endPoint: MINIO_CONFIG.endPoint,
  port: MINIO_CONFIG.port,
  useSSL: MINIO_CONFIG.useSSL,
  accessKey: MINIO_CONFIG.accessKey,
  secretKey: MINIO_CONFIG.secretKey
});

export const BUCKET = MINIO_CONFIG.bucket;