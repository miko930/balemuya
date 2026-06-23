import "dotenv/config";
import { Bot, session } from "grammy";
import { AM } from "../utils/amharic.js";
import {
  showServiceMenu,
  onServiceSelected,
  onDescription,
  onLocation,
  onUrgencySelected,
  onDateReceived,
  onConfirmed,
  onConfirmCancelled,
} from "../handlers/booking.js";
import {
  onStatus,
  onHistory,
  onCancelCmd,
  onDoCancelJob,
  onCancelAbort,
  onRatingSelected,
  onRatingComment,
} from "../handlers/customer.js";

// ─────────────────────────────────────────────────────────────
export function createCustomerBot() {
  const bot = new Bot(process.env.BOT_TOKEN);

  // Session middleware — stores booking state per user
  bot.use(
    session({
      initial: () => ({ step: null, booking: {}, rating: null }),
    })
  );

  // ── Commands ──────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    const name = ctx.from?.first_name ?? "ወዳጅ";
    const isReturning = false; // could check DB here
    await ctx.reply(AM.WELCOME(name), { parse_mode: "Markdown" });
    await showServiceMenu(ctx);
  });

  bot.command("book",    (ctx) => showServiceMenu(ctx));
  bot.command("status",  (ctx) => onStatus(ctx));
  bot.command("history", (ctx) => onHistory(ctx));
  bot.command("cancel",  (ctx) => onCancelCmd(ctx));
  bot.command("help",    (ctx) => ctx.reply(AM.HELP, { parse_mode: "Markdown" }));

  bot.command("skip", async (ctx) => {
    if (ctx.session.step === "awaiting_rating_comment") {
      await onRatingComment(ctx);
    }
  });

  // ── Callback Queries (button taps) ────────────────────────
  bot.callbackQuery(/^svc_/, (ctx) => onServiceSelected(ctx));

  bot.callbackQuery(/^urg_/, (ctx) => onUrgencySelected(ctx));

  bot.callbackQuery("confirm_yes", (ctx) => onConfirmed(ctx));
  bot.callbackQuery("confirm_no",  (ctx) => onConfirmCancelled(ctx));

  bot.callbackQuery(/^do_cancel_(\d+)$/, async (ctx) => {
    const jobId = parseInt(ctx.match[1]);
    await onDoCancelJob(ctx, jobId);
  });
  bot.callbackQuery("cancel_abort", (ctx) => onCancelAbort(ctx));

  bot.callbackQuery(/^rate_(\d+)_(\d+)$/, async (ctx) => {
    const jobId = parseInt(ctx.match[1]);
    const score = parseInt(ctx.match[2]);
    await onRatingSelected(ctx, jobId, score);
  });

  // ── Message Handler (multi-step flow) ────────────────────
  bot.on("message", async (ctx) => {
    const step = ctx.session.step;

    if (step === "awaiting_description") {
      return onDescription(ctx);
    }
    if (step === "awaiting_location") {
      return onLocation(ctx);
    }
    if (step === "awaiting_date") {
      return onDateReceived(ctx);
    }
    if (step === "awaiting_rating_comment") {
      return onRatingComment(ctx);
    }

    // No active step — show menu
    await ctx.reply(AM.CHOOSE_SERVICE, { parse_mode: "Markdown" });
    await showServiceMenu(ctx);
  });

  // ── Error handler ─────────────────────────────────────────
  bot.catch((err) => {
    console.error("Customer bot error:", err.message);
  });

  return bot;
}
