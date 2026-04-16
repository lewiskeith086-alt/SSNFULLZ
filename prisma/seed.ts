import { db } from "../lib/db";
import { hashPassword } from "../lib/auth";

async function ensurePlan(name: string, priceUsd: number, durationDays: number) {
  const existing = await db.subscriptionPlan.findUnique({ where: { name } });
  if (existing) {
    await db.subscriptionPlan.update({ where: { id: existing.id }, data: { priceUsd, durationDays, isActive: true } });
  } else {
    await db.subscriptionPlan.create({ data: { name, priceUsd, durationDays, isActive: true } });
  }
}

async function main() {
  await ensurePlan("1 Day", 15, 1);
  await ensurePlan("7 Days", 60, 7);
  await ensurePlan("30 Days", 140, 30);
  await ensurePlan("90 Days", 350, 90);
  await ensurePlan("Lifetime Access", 2000, 36500);

  for (const name of ["3 Days", "1 Week", "1 Month"]) {
    const found = await db.subscriptionPlan.findUnique({ where: { name } });
    if (found) await db.subscriptionPlan.update({ where: { id: found.id }, data: { isActive: false } });
  }

  let admin = await db.user.findUnique({ where: { email: "admin@example.com" } });
  if (!admin) {
    admin = await db.user.create({ data: { email: "admin@example.com", fullName: "Admin User", passwordHash: await hashPassword("Admin1234"), role: "ADMIN", emailVerifiedAt: new Date() } });
  }

  let user = await db.user.findUnique({ where: { email: "user@example.com" } });
  if (!user) {
    user = await db.user.create({ data: { email: "user@example.com", fullName: "Portal User", passwordHash: await hashPassword("User12345"), role: "USER", emailVerifiedAt: new Date() } });
  }

  if (!(await db.dataset.findFirst())) {
    await db.dataset.create({ data: { name: "Demo Dataset", description: "Seeded demo dataset", uploadedById: admin.id } });
  }

  if (!(await db.newsPost.findFirst())) {
    await db.newsPost.create({ data: { title: "Welcome to the platform", body: "This is the first published update. Admin announcements will appear here for all users.", isPublished: true, publishedById: admin.id } });
  }
}

main().then(async()=>{ await db.$disconnect(); }).catch(async(error)=>{ console.error(error); await db.$disconnect(); process.exit(1); });
