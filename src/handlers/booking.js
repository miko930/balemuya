import { InlineKeyboard } from "grammy";
import { AM } from "../utils/amharic.js";
import { prisma } from "../db/client.js";
import { notifyWorkers } from "./workerNotify.js";

// ─────────────────────────────────────────────────────────────
//  Step 1 — Show service menu
// ─────────────────────────────────────────────────────────────
export async function showServiceMenu(ctx) {
  const kb = new InlineKeyboard()
    .text(AM.SERVICES.plumber.label,     "svc_plumber").row()
    .text(AM.SERVICES.electrician.label, "svc_electrician").row()
    .text(AM.SERVICES.painter.label,     "svc_painter").row()
    .text(AM.SERVICES.carpenter.label,   "svc_carpenter").row()
    .text(AM.SERVICES.ac.label,          "svc_ac").row()
    .text(AM.SERVICES.handyman.label,    "svc_handyman");

  await ctx.reply(AM.CHOOSE_SERVICE, {
    parse_mode: "Markdown",
    reply_markup: kb,
  });
}

// ─────────────────────────────────────────────────────────────
//  Step 2 — Service selected → ask for job description
// ─────────────────────────────────────────────────────────────
export async function onServiceSelected(ctx) {
  const key = ctx.callbackQuery.data.replace("svc_", "");
  const service = AM.SERVICES[key];
  if (!service) return;

  // Store in session
  ctx.session.booking = { category: key, serviceName: service.label };

  await ctx.answerCallbackQuery();
  await ctx.reply(AM.DESCRIBE_JOB(service.label), { parse_mode: "Markdown" });

  // Set state for next message
  ctx.session.step = "awaiting_description";
}

// ─────────────────────────────────────────────────────────────
//  Step 3 — Receive description (text or photo) → ask location
// ─────────────────────────────────────────────────────────────
export async function onDescription(ctx) {
  if (ctx.session.step !== "awaiting_description") return;

  let description = "";

  if (ctx.message.photo) {
    // Photo with optional caption
    const fileId = ctx.message.photo.at(-1).file_id;
    ctx.session.booking.photoId = fileId;
    description = ctx.message.caption || "ፎቶ ተልኳል";
  } else if (ctx.message.text) {
    description = ctx.message.text;
  } else if (ctx.message.voice) {
    description = "🎙 የድምፅ መልዕክት ተልኳል";
  } else {
    await ctx.reply(AM.DESCRIBE_JOB(ctx.session.booking.serviceName), {
      parse_mode: "Markdown",
    });
    return;
  }

  ctx.session.booking.description = description;
  ctx.session.step = "awaiting_location";

  // Ask for location with a keyboard button
  const locKb = {
    keyboard: [
      [{ text: "📍 አሁን ያለሁበትን አካባቢ ላክ", request_location: true }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  await ctx.reply(AM.SHARE_LOCATION, { reply_markup: locKb });
}

// ─────────────────────────────────────────────────────────────
//  Step 4 — Receive location (GPS or text) → ask urgency
// ─────────────────────────────────────────────────────────────
export async function onLocation(ctx) {
  if (ctx.session.step !== "awaiting_location") return;

  if (ctx.message.location) {
    ctx.session.booking.lat = ctx.message.location.latitude;
    ctx.session.booking.lng = ctx.message.location.longitude;
    ctx.session.booking.address = "📍 GPS አካባቢ";
  } else if (ctx.message.text) {
    ctx.session.booking.address = ctx.message.text;
  } else {
    await ctx.reply(AM.SHARE_LOCATION);
    return;
  }

  ctx.session.step = "awaiting_urgency";
  await showUrgencyMenu(ctx);
}

async function showUrgencyMenu(ctx) {
  const kb = new InlineKeyboard()
    .text(AM.URGENCY.asap,      "urg_asap").row()
    .text(AM.URGENCY.today,     "urg_today").row()
    .text(AM.URGENCY.scheduled, "urg_scheduled");

  // Remove the previous location keyboard first
  await ctx.reply("✅", { reply_markup: { remove_keyboard: true } });

  // Then show urgency options with inline keyboard
  await ctx.reply(AM.CHOOSE_URGENCY, {
    parse_mode: "Markdown",
    reply_markup: kb,
  });
}

// ─────────────────────────────────────────────────────────────
//  Step 5 — Urgency selected → show confirmation
// ─────────────────────────────────────────────────────────────
export async function onUrgencySelected(ctx) {
  const urgency = ctx.callbackQuery.data.replace("urg_", "");
  await ctx.answerCallbackQuery();

  ctx.session.booking.urgency = urgency;

  if (urgency === "scheduled") {
    ctx.session.step = "awaiting_date";
    await ctx.reply(AM.CHOOSE_DATE, { parse_mode: "Markdown" });
    return;
  }

  await showConfirmation(ctx);
}

export async function onDateReceived(ctx) {
  if (ctx.session.step !== "awaiting_date") return;
  ctx.session.booking.scheduledDate = ctx.message.text;
  ctx.session.booking.urgencyLabel = ctx.message.text;
  await showConfirmation(ctx);
}

async function showConfirmation(ctx) {
  ctx.session.step = "awaiting_confirmation";

  const b = ctx.session.booking;
  const urgencyLabel =
    b.urgency === "asap"      ? AM.URGENCY.asap :
    b.urgency === "today"     ? AM.URGENCY.today :
    b.scheduledDate           ? b.scheduledDate : AM.URGENCY.scheduled;

  const price = AM.PRICE_RANGES[b.category] || "ይነጋገሩ";

  const kb = new InlineKeyboard()
    .text(AM.CONFIRM_YES, "confirm_yes")
    .text(AM.CONFIRM_NO,  "confirm_no");

  await ctx.reply(
    AM.CONFIRM_BOOKING({
      service:     b.serviceName,
      description: b.description,
      address:     b.address,
      urgency:     urgencyLabel,
      price,
    }),
    { parse_mode: "Markdown", reply_markup: kb }
  );
}

// ─────────────────────────────────────────────────────────────
//  Step 6 — Confirmed → save to DB → notify workers
// ─────────────────────────────────────────────────────────────
export async function onConfirmed(ctx) {
  await ctx.answerCallbackQuery();

  const tgId = String(ctx.from.id);
  const b    = ctx.session.booking;

  // Upsert customer
  const customer = await prisma.customer.upsert({
    where:  { telegramId: tgId },
    update: {},
    create: {
      telegramId: tgId,
      firstName:  ctx.from.first_name,
    },
  });

  // Create job
  const price = AM.PRICE_RANGES[b.category] || "ይነጋገሩ";
  const job = await prisma.job.create({
    data: {
      customerId:  customer.id,
      category:    b.category,
      description: b.description,
      address:     b.address,
      subCity:     b.address,
      locationLat: b.lat ?? null,
      locationLng: b.lng ?? null,
      urgency:     b.urgency,
      status:      "PENDING",
      quotedPrice: price,
    },
  });

  // Clear session
  ctx.session.booking = {};
  ctx.session.step    = null;

  await ctx.reply(AM.BOOKING_SENT, { parse_mode: "Markdown" });

  // Notify all available workers
  await notifyWorkers(ctx.api, job);
}

export async function onConfirmCancelled(ctx) {
  await ctx.answerCallbackQuery();
  ctx.session.booking = {};
  ctx.session.step    = null;
  await ctx.reply(AM.CANCELLED);
}
