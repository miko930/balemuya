import "dotenv/config";
import { Bot, session } from "grammy";
import { AM_WORKER } from "../utils/amharic.js";
import {
  onWorkerStart,
  onToggleAvailable,
  onMyJobs,
  onAcceptJob,
  onSkipJob,
  onArrived,
  onMarkComplete,
  onFinalPrice,
} from "../handlers/worker.js";

/**
 * Create the worker-facing Telegram bot.
 * Receives customerBotApi so it can message customers directly.
 */
export function createWorkerBot(customerBotApi) {
  const bot = new Bot(process.env.WORKER_BOT_TOKEN);

  bot.use(
    session({
      initial: () => ({ step: null, completingJobId: null }),
    })
  );

  // ── Commands ──────────────────────────────────────────────
  bot.command("start",     (ctx) => onWorkerStart(ctx));
  bot.command("available", (ctx) => onToggleAvailable(ctx));
  bot.command("myjobs",    (ctx) => onMyJobs(ctx));
  bot.command("help",      (ctx) =>
    ctx.reply(AM_WORKER.HELP, { parse_mode: "Markdown" })
  );

  // ── Callback Queries ───────────────────────────────────────
  bot.callbackQuery(/^accept_(\d+)$/, async (ctx) => {
    const jobId = parseInt(ctx.match[1]);
    await onAcceptJob(ctx, jobId, customerBotApi);
  });

  bot.callbackQuery(/^skip_(\d+)$/, (ctx) => onSkipJob(ctx));

  bot.callbackQuery(/^arrived_(\d+)$/, async (ctx) => {
    const jobId = parseInt(ctx.match[1]);
    await onArrived(ctx, jobId, customerBotApi);
  });

  bot.callbackQuery(/^complete_(\d+)$/, async (ctx) => {
    const jobId = parseInt(ctx.match[1]);
    await onMarkComplete(ctx, jobId);
  });

  // ── Message handler (final price input) ───────────────────
  bot.on("message:text", async (ctx) => {
    if (ctx.session.step === "awaiting_final_price") {
      return onFinalPrice(ctx, customerBotApi);
    }
    await ctx.reply(AM_WORKER.HELP, { parse_mode: "Markdown" });
  });

  bot.catch((err) => {
    console.error("Worker bot error:", err.message);
  });

  return bot;
}
