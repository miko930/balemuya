import { InlineKeyboard } from "grammy";
import { AM } from "../utils/amharic.js";
import { prisma } from "../db/client.js";

// ─── /status ──────────────────────────────────────────────────
export async function onStatus(ctx) {
  const customer = await prisma.customer.findUnique({
    where: { telegramId: String(ctx.from.id) },
    include: {
      jobs: {
        where:   { status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] } },
        include: { worker: true },
        orderBy: { createdAt: "desc" },
        take:    1,
      },
    },
  });

  const job = customer?.jobs[0];
  if (!job) {
    await ctx.reply(AM.NO_ACTIVE_JOB);
    return;
  }

  const statusLabel = AM.STATUS_LABELS[job.status] ?? job.status;
  let text =
    `📋 *የትዕዛዝ ሁኔታ*\n\n` +
    `🛠 ${job.category}\n` +
    `📍 ${job.address}\n` +
    `📊 ሁኔታ: ${statusLabel}`;

  if (job.worker) {
    text +=
      `\n\n👷 ባለሙያ: ${job.worker.firstName}\n` +
      `📞 ${job.worker.phone}`;
  }

  await ctx.reply(text, { parse_mode: "Markdown" });
}

// ─── /history ──────────────────────────────────────────────────
export async function onHistory(ctx) {
  const customer = await prisma.customer.findUnique({
    where: { telegramId: String(ctx.from.id) },
    include: {
      jobs: {
        orderBy: { createdAt: "desc" },
        take:    10,
      },
    },
  });

  if (!customer?.jobs.length) {
    await ctx.reply(AM.HISTORY_EMPTY);
    return;
  }

  const lines = customer.jobs.map((j, i) => AM.HISTORY_ITEM(j, i)).join("\n\n");
  await ctx.reply(`📜 *ያለፉ ትዕዛዞች*\n\n${lines}`, { parse_mode: "Markdown" });
}

// ─── /cancel ──────────────────────────────────────────────────
export async function onCancelCmd(ctx) {
  const customer = await prisma.customer.findUnique({
    where: { telegramId: String(ctx.from.id) },
    include: {
      jobs: {
        where:   { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take:    1,
      },
    },
  });

  if (!customer?.jobs.length) {
    await ctx.reply(AM.NO_ACTIVE_JOB);
    return;
  }

  const kb = new InlineKeyboard()
    .text(AM.CANCEL_YES, `do_cancel_${customer.jobs[0].id}`)
    .text(AM.CANCEL_NO,  "cancel_abort");

  await ctx.reply(AM.CANCEL_CONFIRM, { reply_markup: kb });
}

export async function onDoCancelJob(ctx, jobId) {
  await prisma.job.update({
    where: { id: jobId },
    data:  { status: "CANCELLED" },
  });
  await ctx.answerCallbackQuery();
  await ctx.reply(AM.CANCELLED);
}

export async function onCancelAbort(ctx) {
  await ctx.answerCallbackQuery("ኋላ ቀርቷል");
  await ctx.deleteMessage();
}

// ─── Rating flow (triggered after job COMPLETED) ──────────────
export async function askForRating(api, job) {
  const customer = await prisma.customer.findUnique({
    where: { id: job.customerId },
  });
  const worker = await prisma.worker.findUnique({
    where: { id: job.workerId },
  });
  if (!customer || !worker) return;

  const kb = new InlineKeyboard()
    .text(AM.RATING_STARS[5], `rate_${job.id}_5`).row()
    .text(AM.RATING_STARS[4], `rate_${job.id}_4`).row()
    .text(AM.RATING_STARS[3], `rate_${job.id}_3`).row()
    .text(AM.RATING_STARS[2], `rate_${job.id}_2`).row()
    .text(AM.RATING_STARS[1], `rate_${job.id}_1`);

  await api.sendMessage(
    customer.telegramId,
    AM.RATE_WORKER(worker.firstName),
    { parse_mode: "Markdown", reply_markup: kb }
  );
}

export async function onRatingSelected(ctx, jobId, score) {
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

  ctx.session.rating = { jobId, score };
  ctx.session.step   = "awaiting_rating_comment";

  await ctx.reply(AM.RATING_COMMENT);
}

export async function onRatingComment(ctx) {
  if (ctx.session.step !== "awaiting_rating_comment") return;

  const { jobId, score } = ctx.session.rating;
  const comment = ctx.message.text === "/skip" ? null : ctx.message.text;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job?.workerId) return;

  // Save rating
  await prisma.rating.create({
    data: { jobId, workerId: job.workerId, score, comment },
  });

  // Recompute worker average rating
  const agg = await prisma.rating.aggregate({
    where:   { workerId: job.workerId },
    _avg:    { score: true },
    _count:  { score: true },
  });
  await prisma.worker.update({
    where: { id: job.workerId },
    data:  {
      rating:        agg._avg.score ?? score,
      jobsCompleted: { increment: 1 },
    },
  });

  ctx.session.rating = null;
  ctx.session.step   = null;
  await ctx.reply(AM.RATING_THANKS);
}
