import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

export async function downloadStreamFromR2(storedPath: string): Promise<Readable> {
  const { bucket, key } = parseStoredPath(storedPath);
  const client = getR2Client();

  const res = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  if (!res.Body) {
    throw new Error("Downloaded file body was empty");
  }

  return res.Body as Readable;
}