/**
 * seed.js — የ 10 ታማኝ ሠራተኞች ምዝገባ
 * Run: node src/db/seed.js
 *
 * Replace the telegramId values with the real Telegram user IDs
 * of your 10 trusted workers (you can get these by asking them to
 * message @userinfobot on Telegram).
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const TRUSTED_WORKERS = [
  {
    telegramId: "111111111", // ← Replace with real Telegram ID
    firstName:  "አበበ",
    phone:      "+251911000001",
    category:   ["plumber"],
    subCity:    "ቦሌ",
  },
  {
    telegramId: "222222222",
    firstName:  "ካሊድ",
    phone:      "+251911000002",
    category:   ["electrician"],
    subCity:    "አቃቂ",
  },
  {
    telegramId: "333333333",
    firstName:  "ሙሉጌታ",
    phone:      "+251911000003",
    category:   ["painter"],
    subCity:    "ቦሌ",
  },
  {
    telegramId: "444444444",
    firstName:  "ዳዊት",
    phone:      "+251911000004",
    category:   ["electrician", "handyman"],
    subCity:    "ጉለሌ",
  },
  {
    telegramId: "555555555",
    firstName:  "ጊዮርጊስ",
    phone:      "+251911000005",
    category:   ["plumber", "handyman"],
    subCity:    "ኮልፌ",
  },
  {
    telegramId: "666666666",
    firstName:  "ሰለሞን",
    phone:      "+251911000006",
    category:   ["carpenter"],
    subCity:    "የካ",
  },
  {
    telegramId: "777777777",
    firstName:  "ኃይሌ",
    phone:      "+251911000007",
    category:   ["ac"],
    subCity:    "ቦሌ",
  },
  {
    telegramId: "888888888",
    firstName:  "ቴዎድሮስ",
    phone:      "+251911000008",
    category:   ["painter", "handyman"],
    subCity:    "ቂርቆስ",
  },
  {
    telegramId: "999999999",
    firstName:  "ዮሐንስ",
    phone:      "+251911000009",
    category:   ["plumber", "carpenter"],
    subCity:    "አዲስ ከተማ",
  },
  {
    telegramId: "101010101",
    firstName:  "ሮቤል",
    phone:      "+251911000010",
    category:   ["electrician", "ac"],
    subCity:    "ልደታ",
  },
];

async function seed() {
  console.log("🌱 Seeding 10 trusted workers...\n");

  for (const w of TRUSTED_WORKERS) {
    const worker = await prisma.worker.upsert({
      where:  { telegramId: w.telegramId },
      update: w,
      create: { ...w, isVerified: true, isAvailable: true, rating: 5.0 },
    });
    console.log(`  ✅ ${worker.firstName} (${worker.category.join(", ")}) — ${worker.subCity}`);
  }

  console.log("\n✅ Done! 10 workers registered.");
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
