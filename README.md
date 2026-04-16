# GBP v3 Phase 3 + 4 Corrected + R2 Uploads

This build stores uploaded raw files in Cloudflare R2 instead of local disk.

## Seeded accounts
- admin@example.com / Admin1234
- user@example.com / User12345

## Seeded plans
- 1 Day — $15
- 3 Days — $30
- 1 Week — $120
- 1 Month — $400

## Setup
npm install
copy .env.example .env
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev

## Required R2 environment variables
- R2_ACCOUNT_ID
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET_NAME
- R2_PUBLIC_BASE_URL (optional)

## Notes
- Raw uploaded files go to Cloudflare R2 under `datasets/<datasetId>/...`
- Parsed record rows still go into Postgres for search
- This version still parses the uploaded CSV inside the app process, so extremely large single-file imports should be split into smaller batches or moved to a background ingest worker later
