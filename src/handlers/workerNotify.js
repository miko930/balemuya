import { InlineKeyboard } from "grammy";
import { AM_WORKER } from "../utils/amharic.js";
import { prisma } from "../db/client.js";
import { getWorkerBotApi } from "../bot/shared.js";

/**
 * Notify all available workers about a new job.
 * First worker to tap "✅ ተቀበለ" gets the job.
 *
 * Uses the WORKER bot's API so notifications arrive
 * in the worker bot chat (not the customer bot).
 */
export async function notifyWorkers(customerApi, job) {
  const workerApi = getWorkerBotApi();
  const api = workerApi ?? customerApi; // fallback just in case

  // Get the customer's telegramId so we don't notify them as a worker
  let customerTgId = null;
  if (job.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: job.customerId },
    });
    if (customer) customerTgId = customer.telegramId;
  }

  const workers = await prisma.worker.findMany({
    where: {
      isAvailable: true,
      isVerified:  true,
      // Match workers who handle this category
      category: { has: job.category },
      // Don't notify the customer if they're also a worker
      ...(customerTgId ? { telegramId: { not: customerTgId } } : {}),
    },
  });

  console.log(`📢 Job #${job.id} (${job.category}) — Found ${workers.length} matching worker(s)`);

  if (workers.length === 0) {
    console.log(`⚠️ No available workers for Job #${job.id}. Alerting admin.`);
    // No workers → alert admin
    const adminId = process.env.ADMIN_TELEGRAM_ID;
    if (adminId && adminId !== "your_admin_telegram_id") {
      await customerApi.sendMessage(
        adminId,
        `⚠️ ባለሙያ አልተገኘም!\nJob #${job.id} — ${job.category}\nአድራሻ: ${job.address}`
      );
    }
    return;
  }

  const kb = new InlineKeyboard()
    .text(AM_WORKER.ACCEPT, `accept_${job.id}`)
    .text(AM_WORKER.SKIP,   `skip_${job.id}`);

  // Send alert to all available workers simultaneously
  const sends = workers.map((w) => {
    console.log(`  → Notifying worker "${w.firstName}" (TG: ${w.telegramId})`);
    return api
      .sendMessage(w.telegramId, AM_WORKER.NEW_JOB_ALERT(job), {
        parse_mode:   "Markdown",
        reply_markup: kb,
      })
      .catch((err) => {
        console.error(`  ✖ Failed to notify worker ${w.firstName}: ${err.message}`);
      });
  });

  await Promise.all(sends);
}

