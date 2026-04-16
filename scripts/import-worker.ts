import { PrismaClient } from "@prisma/client"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import readline from "readline"

const prisma = new PrismaClient()

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
})

async function streamFromR2(key: string) {
  const res = await s3.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
    })
  )

  return res.Body as any
}

async function processDataset(dataset: any) {
  console.log("Processing dataset:", dataset.id)

  const stream = await streamFromR2(dataset.r2Key)

  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  })

  let batch: any[] = []
  let count = 0

  for await (const line of rl) {
    if (!line.trim()) continue

    const parts = line.split(",")

    const record = {
      firstName: parts[1] || null,
      lastName: parts[2] || null,
      middleName: parts[3] || null,
      prefix: parts[4] || null,
      dob: parts[5] || null,
      address: parts[6] || null,
      city: parts[7] || null,
      county: parts[8] || null,
      state: parts[9] || null,
      zip: parts[10] || null,
      phone: parts[11] || null,
      constNumber: parts[parts.length - 1] || null,
      datasetId: dataset.id,
    }

    batch.push(record)

    if (batch.length >= 500) {
      await prisma.record.createMany({
        data: batch,
        skipDuplicates: true,
      })

      count += batch.length
      console.log("Inserted:", count)

      batch = []
    }
  }

  if (batch.length > 0) {
    await prisma.record.createMany({
      data: batch,
      skipDuplicates: true,
    })

    count += batch.length
  }

  console.log("Finished:", count)

  await prisma.dataset.update({
    where: { id: dataset.id },
    data: { status: "done" },
  })
}

async function main() {
  console.log("Import worker started")

  const dataset = await prisma.dataset.findFirst({
    where: { status: "pending" },
  })

  if (!dataset) {
    console.log("No pending datasets")
    return
  }

  await prisma.dataset.update({
    where: { id: dataset.id },
    data: { status: "processing" },
  })

  await processDataset(dataset)
}

main()