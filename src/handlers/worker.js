import { InlineKeyboard } from "grammy";
import { AM_WORKER } from "../utils/amharic.js";
import { prisma } from "../db/client.js";
import { askForRating } from "./customer.js";

// ─── /start for workers ───────────────────────────────────────
export async function onWorkerStart(ctx) {
  const tgId = String(ctx.from.id);

  let worker = await prisma.worker.findUnique({
    where: { telegramId: tgId },
  });

  if (!worker) {
    // Auto-register as pending worker
    worker = await prisma.worker.create({
      data: {
        telegramId: tgId,
        firstName: ctx.from.first_name || "Worker",
        isVerified: false,
        isAvailable: false,
      },
    });

    await ctx.reply(
      `👋 ሰላም ${worker.firstName}!\n\n` +
      `✅ አካውንትዎ ተመዝግቧል።\n` +
      `⏳ አስተዳዳሪው መረጃዎን ካጠናቀቁ በኋላ ሥራ ማግኘት ይጀምራሉ።\n\n` +
      `📋 የእርስዎ Telegram ID: \`${tgId}\``,
      { parse_mode: "Markdown" }
    );
    return;
  }

  if (!worker.isVerified) {
    await ctx.reply(
      `⏳ አካውንትዎ ገና በአስተዳዳሪ እየተገመገመ ነው።\n` +
      `ትንሽ ይጠብቁ — ሲጠናቀቅ እናሳውቅዎታለን!`
    );
    return;
  }

  await ctx.reply(AM_WORKER.WELCOME(worker.firstName), {
    parse_mode: "Markdown",
  });
}

// ─── /available — toggle on/off ───────────────────────────────
export async function onToggleAvailable(ctx) {
  const worker = await prisma.worker.findUnique({
    where: { telegramId: String(ctx.from.id) },
  });
  if (!worker) return;

  const newState = !worker.isAvailable;
  await prisma.worker.update({
    where: { id: worker.id },
    data:  { isAvailable: newState },
  });

  await ctx.reply(
    newState ? AM_WORKER.AVAILABLE_ON : AM_WORKER.AVAILABLE_OFF
  );
}

// ─── /myjobs ─────────────────────────────────────────────────
export async function onMyJobs(ctx) {
  const worker = await prisma.worker.findUnique({
    where: { telegramId: String(ctx.from.id) },
    include: {
      jobs: {
        orderBy: { createdAt: "desc" },
        take:    10,
      },
    },
  });
  if (!worker) return;

  if (!worker.jobs.length) {
    await ctx.reply(AM_WORKER.NO_JOBS);
    return;
  }

  await ctx.reply(AM_WORKER.MY_JOBS(worker.jobsCompleted, worker.rating), {
    parse_mode: "Markdown",
  });
}

// ─── Worker accepts a job (callback: accept_<jobId>) ─────────
export async function onAcceptJob(ctx, jobId, customerBotApi) {
  const workerTgId = String(ctx.from.id);
  const worker = await prisma.worker.findUnique({
    where: { telegramId: workerTgId },
  });
  if (!worker) return;

  // Race-proof: only first worker wins
  const job = await prisma.$transaction(async (tx) => {
    const j = await tx.job.findUnique({ where: { id: jobId } });
    if (!j || j.status !== "PENDING") return null;

    return tx.job.update({
      where:   { id: jobId },
      data:    { status: "ASSIGNED", workerId: worker.id },
      include: { customer: true },
    });
  });

  if (!job) {
    await ctx.answerCallbackQuery("⚠️ ትዕዛዙ ቀድሞ ተወሰደ።");
    return;
  }

  await ctx.answerCallbackQuery("✅ ተቀበልህ!");
  await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

  // Arrival / complete buttons
  const kb = new InlineKeyboard()
    .text(AM_WORKER.MARK_ARRIVED,  `arrived_${jobId}`).row()
    .text(AM_WORKER.MARK_COMPLETE, `complete_${jobId}`);

  await ctx.reply(
    AM_WORKER.JOB_ACCEPTED(job.customer.phone ?? "—"),
    { parse_mode: "Markdown", reply_markup: kb }
  );

  // ── Notify the customer that a worker accepted ──
  if (customerBotApi) {
    try {
      await customerBotApi.sendMessage(
        job.customer.telegramId,
        `✅ *ባለሙያ ተመድቧል!*\n\n` +
        `👷 ስም: *${worker.firstName}*\n` +
        `📞 ስልክ: ${worker.phone || "—"}\n` +
        `📍 ክፍለ ከተማ: ${worker.subCity || "—"}\n\n` +
        `ባለሙያው በቅርቡ ይደርሳሉ። 🏃`,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      console.error("Failed to notify customer about assignment:", err.message);
    }
  }
}

// ─── Worker skips a job (callback: skip_<jobId>) ─────────────
export async function onSkipJob(ctx) {
  await ctx.answerCallbackQuery("ዝለል ✓");
  await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
}

// ─── Worker marks arrived (callback: arrived_<jobId>) ─────────
export async function onArrived(ctx, jobId, customerBotApi) {
  const worker = await prisma.worker.findUnique({
    where: { telegramId: String(ctx.from.id) },
  });
  if (!worker) return;

  const job = await prisma.job.update({
    where:   { id: jobId },
    data:    { status: "IN_PROGRESS" },
    include: { customer: true },
  });

  await ctx.answerCallbackQuery();
  await ctx.reply(AM_WORKER.ARRIVED_SENT);

  // Notify customer
  await customerBotApi.sendMessage(
    job.customer.telegramId,
    `🏃 *${worker.firstName} ደረሱ!*\n\nሥራ ጀምሯል። 🔧`,
    { parse_mode: "Markdown" }
  );
}

// ─── Worker marks complete (callback: complete_<jobId>) ───────
export async function onMarkComplete(ctx, jobId) {
  ctx.session.completingJobId = jobId;
  ctx.session.step = "awaiting_final_price";
  await ctx.answerCallbackQuery();
  await ctx.reply(AM_WORKER.COMPLETE_PRICE);
}

export async function onFinalPrice(ctx, customerBotApi) {
  if (ctx.session.step !== "awaiting_final_price") return;

  const priceText = ctx.message.text.trim();
  const price     = parseInt(priceText.replace(/[^\d]/g, ""), 10);

  if (isNaN(price) || price <= 0) {
    await ctx.reply("❌ ትክክለኛ ቁጥር ጻፍ (ምሳሌ: 450)");
    return;
  }

  const jobId = ctx.session.completingJobId;
  const job   = await prisma.job.update({
    where:   { id: jobId },
    data:    { status: "COMPLETED", finalPrice: price, completedAt: new Date() },
    include: { customer: true },
  });

  ctx.session.step = null;
  ctx.session.completingJobId = null;

  await ctx.reply(AM_WORKER.JOB_DONE(price), { parse_mode: "Markdown" });

  // Notify customer & ask for rating
  await customerBotApi.sendMessage(
    job.customer.telegramId,
    `✅ *ሥራ ተጠናቀቀ!*\n💰 የተከፈለ: ${price} ብር\n\nFikirFix ስለ አገልጋሉ እናመሰግናለን! 🙏`,
    { parse_mode: "Markdown" }
  );

  // Trigger rating flow on customer bot
  await askForRating(customerBotApi, job);
}
