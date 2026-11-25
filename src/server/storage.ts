import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * File storage. Uses S3-compatible storage when S3_ENDPOINT is set (SeaweedFS in Docker, any S3 service in
 * production); otherwise a local folder (`.data/files`) so `pnpm dev` works without Docker.
 */
const g = globalThis as unknown as { __vettlyS3?: S3Client };

function s3() {
  if (!process.env.S3_ENDPOINT) return null;
  g.__vettlyS3 ??= new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "af-south-1",
    forcePathStyle: true,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY ?? "", secretAccessKey: process.env.S3_SECRET_KEY ?? "" },
  });
  return g.__vettlyS3;
}

const bucket = () => process.env.S3_BUCKET ?? "vettly-documents";
const localDir = () => path.join(process.cwd(), ".data", "files");

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  const client = s3();
  if (client) {
    await client.send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }));
    return;
  }
  const file = path.join(localDir(), key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}

export async function getObject(key: string): Promise<Uint8Array> {
  const client = s3();
  if (client) {
    const res = await client.send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    return new Uint8Array(await res.Body!.transformToByteArray());
  }
  return new Uint8Array(await readFile(path.join(localDir(), key)));
}

export async function deleteObject(key: string) {
  const client = s3();
  if (client) {
    await client.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
    return;
  }
  await rm(path.join(localDir(), key), { force: true });
}
