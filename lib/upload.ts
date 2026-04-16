import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function buildStoredFileName(name: string) {
  return `${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

function getR2Client() {
  const accountId = getRequiredEnv("R2_ACCOUNT_ID");
  const accessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getRequiredEnv("R2_SECRET_ACCESS_KEY");

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function uploadBufferToR2(input: {
  key: string;
  body: Buffer;
  contentType?: string;
}) {
  const bucket = getRequiredEnv("R2_BUCKET_NAME");
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType || "application/octet-stream",
    })
  );

  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();
  const publicUrl = publicBaseUrl ? `${publicBaseUrl.replace(/\/$/, "")}/${input.key}` : null;

  return {
    bucket,
    key: input.key,
    publicUrl,
    storedPath: publicUrl || `r2://${bucket}/${input.key}`,
  };
}

export function parseStoredPath(storedPath: string) {
  if (!storedPath.startsWith("r2://")) {
    throw new Error(`Unsupported stored path: ${storedPath}`);
  }

  const withoutScheme = storedPath.slice(5);
  const slashIndex = withoutScheme.indexOf("/");
  if (slashIndex === -1) throw new Error(`Invalid stored path: ${storedPath}`);

  return {
    bucket: withoutScheme.slice(0, slashIndex),
    key: withoutScheme.slice(slashIndex + 1),
  };
}

export async function downloadTextFromR2(storedPath: string) {
  const { bucket, key } = parseStoredPath(storedPath);
  const client = getR2Client();

  const res = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  const body = await res.Body?.transformToString();
  if (!body) throw new Error("Downloaded file was empty");

  return body;
}
