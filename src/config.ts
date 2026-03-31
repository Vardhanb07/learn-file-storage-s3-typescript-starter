import { newDatabase } from "./db/db";
import type { Database } from "bun:sqlite";
import { s3, S3Client } from "bun";

export type ApiConfig = {
  db: Database;
  jwtSecret: string;
  platform: string;
  filepathRoot: string;
  assetsRoot: string;
  s3Bucket: string;
  s3Region: string;
  s3CfDistribution: string;
  s3Key: string;
  port: string;
  s3Client: S3Client;
  MAX_THUMBNAIL_UPLOAD_SIZE: number;
  MAX_VIDEO_UPLOAD_SIZE: number;
  S3_EXPIRE_TIME: number;
};

const pathToDB = envOrThrow("DB_PATH");
const jwtSecret = envOrThrow("JWT_SECRET");
const platform = envOrThrow("PLATFORM");
const filepathRoot = envOrThrow("FILEPATH_ROOT");
const assetsRoot = envOrThrow("ASSETS_ROOT");
const s3Bucket = envOrThrow("S3_BUCKET");
const s3Region = envOrThrow("S3_REGION");
const s3CfDistribution = envOrThrow("S3_CF_DISTRO");
const port = envOrThrow("PORT");
const MAX_THUMBNAIL_UPLOAD_SIZE = 10 << 20;
const MAX_VIDEO_UPLOAD_SIZE = 1 << 30;
const s3Key = envOrThrow("AWS_SECRET_ACCESS_KEY");
const S3_EXPIRE_TIME = parseInt(envOrThrow("S3_EXPIRE_TIME"));

const db = newDatabase(pathToDB);

export const cfg: ApiConfig = {
  db: db,
  jwtSecret: jwtSecret,
  platform: platform,
  filepathRoot: filepathRoot,
  assetsRoot: assetsRoot,
  s3Bucket: s3Bucket,
  s3Region: s3Region,
  s3CfDistribution: s3CfDistribution,
  port: port,
  s3Client: s3,
  MAX_THUMBNAIL_UPLOAD_SIZE: MAX_THUMBNAIL_UPLOAD_SIZE,
  MAX_VIDEO_UPLOAD_SIZE: MAX_VIDEO_UPLOAD_SIZE,
  s3Key: s3Key,
  S3_EXPIRE_TIME: S3_EXPIRE_TIME,
};

function envOrThrow(key: string) {
  const envVar = process.env[key];
  if (!envVar) {
    throw new Error(`${key} must be set`);
  }
  return envVar;
}
