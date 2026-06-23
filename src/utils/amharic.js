/**
 * FikirFix — All Amharic UI strings
 * ሁሉም የቦቱ ጽሑፎች በአማርኛ
 */

export const AM = {
  // ── Welcome ──────────────────────────────────────────────────
  WELCOME: (name) =>
    `👋 ሰላም ${name}!\n\n` +
    `እንኳን ወደ *FikirFix* በደህና መጡ! 🔧\n\n` +
    `ቤትዎ ጥገና ይፈልጋል? — ፕሎምቢንግ፣ ኤሌክትሪክ፣ ቀለም ወይም ሌላ?\n` +
    `በጥቂት ደቂቃ ውስጥ ባለሙያ እናደርሳለን። ✅`,

  WELCOME_BACK: (name) =>
    `👋 እንኳን ተመለሱ ${name}! ምን ልርዳዎ?`,

  // ── Main Menu ─────────────────────────────────────────────────
  CHOOSE_SERVICE: `🛠 ምን ዓይነት አገልግሎት ይፈልጋሉ?\n\nከታች ካለው ዝርዝር ይምረጡ 👇`,

  SERVICES: {
    plumber:     { label: "🔧 ፕሎምቢንግ",       key: "plumber" },
    electrician: { label: "⚡ ኤሌክትሪሻን",       key: "electrician" },
    painter:     { label: "🎨 ቀለም ቀቢ",        key: "painter" },
    carpenter:   { label: "🪚 አናጢ",            key: "carpenter" },
    ac:          { label: "❄️ ኤ/ሲ ጥገና",       key: "ac" },
    handyman:    { label: "🔩 አጠቃላይ ጥገና",     key: "handyman" },
  },

  // ── Describe Job ─────────────────────────────────────────────
  DESCRIBE_JOB: (service) =>
    `✍️ ስለ *${service}* ሥራው ይግለጹ:\n\n` +
    `ምን ችግር አለ? ፎቶ ቢልኩ ይጠቅማል።\n` +
    `(ምሳሌ: "ቧንቧ ፈሰሰ" ወይም "ኤሌክትሪክ ተቋረጠ")`,

  // ── Location ─────────────────────────────────────────────────
  SHARE_LOCATION:
    `📍 አድራሻዎን ይላኩ:\n\n` +
    `• ከታች ያለውን 📎 ቁልፍ ተጫኑ → "Location" ምረጡ\n` +
    `• ወይም ሰፈርዎን በጽሑፍ ይጻፉ (ምሳሌ: "ቦሌ፣ መሸ ሞል አቅራቢያ")`,

  LOCATION_RECEIVED: `✅ አድራሻ ተቀበልን!`,

  // ── Urgency ──────────────────────────────────────────────────
  CHOOSE_URGENCY: `⏰ መቼ ይፈልጋሉ?`,

  URGENCY: {
    asap:      "🔴 አሁኑኑ (< 2 ሰዓት)",
    today:     "🟡 ዛሬ",
    scheduled: "🟢 ቀን ይምረጡ",
  },

  CHOOSE_DATE: `📅 የሚፈልጉትን ቀን ይጻፉ:\n(ምሳሌ: "ነገ ጠዋት" ወይም "ቅዳሜ ከሰዓት")`,

  // ── Confirmation ─────────────────────────────────────────────
  CONFIRM_BOOKING: (details) =>
    `📋 *ማረጋገጫ*\n\n` +
    `🛠 አገልግሎት: ${details.service}\n` +
    `📝 ችግር: ${details.description}\n` +
    `📍 አድራሻ: ${details.address}\n` +
    `⏰ ጊዜ: ${details.urgency}\n` +
    `💰 ግምት: ${details.price}\n\n` +
    `ትክክለኛ ነው?`,

  CONFIRM_YES: "✅ አዎ፣ አዝዝ",
  CONFIRM_NO:  "✏️ ቀይር",

  // ── Booking Success ───────────────────────────────────────────
  BOOKING_SENT:
    `✅ *ትዕዛዝ ተቀበልን!*\n\n` +
    `ባለሙያ እየፈለግን ነው — ብዙም አይቆይም። ⏳\n` +
    `ሲሾምልዎ ወዲያው እናሳውቅዎታለን። 📲`,

  WORKER_ASSIGNED: (worker, eta) =>
    `🎉 *ባለሙያ ተመደበ!*\n\n` +
    `👷 ${worker.firstName} (⭐ ${worker.rating.toFixed(1)})\n` +
    `📞 ${worker.phone}\n` +
    `🕐 ETA: ${eta}\n\n` +
    `ሲደርሱ ያሳውቃቸዋል። ዝግጁ ሁኑ!`,

  // ── Price Ranges ─────────────────────────────────────────────
  PRICE_RANGES: {
    plumber:     "300 – 800 ብር",
    electrician: "200 – 1,000 ብር",
    painter:     "800 – 5,000 ብር",
    carpenter:   "400 – 2,000 ብር",
    ac:          "500 – 2,500 ብር",
    handyman:    "200 – 600 ብር",
  },

  PRICE_NOTE: (range) =>
    `💰 የዚህ ዓይነት ሥራ ዋጋ ብዙ ጊዜ *${range}* ነው።\n` +
    `ባለሙያው ሲደርሱ ዋጋ ይነጋገሩ።`,

  // ── Job Status ────────────────────────────────────────────────
  STATUS_LABELS: {
    PENDING:     "⏳ ባለሙያ እየተፈለገ",
    ASSIGNED:    "🏃 ባለሙያ በመምጣት ላይ",
    IN_PROGRESS: "🔧 ሥራ ላይ",
    COMPLETED:   "✅ ተጠናቀቀ",
    CANCELLED:   "❌ ተሰርዟል",
    DISPUTED:    "⚠️ ቅሬታ ቀርቧል",
  },

  NO_ACTIVE_JOB: `ምንም ንቁ ትዕዛዝ የለዎትም። አዲስ ለማዝዝ /book ይጫኑ።`,

  // ── Rating ────────────────────────────────────────────────────
  RATE_WORKER: (name) =>
    `⭐ ሥራው እንዴት ነበር?\n\n` +
    `${name}ን ይመዝኑ 👇`,

  RATING_STARS: {
    1: "⭐ 1 — በጣም ደካማ",
    2: "⭐⭐ 2 — ደካማ",
    3: "⭐⭐⭐ 3 — መካከለኛ",
    4: "⭐⭐⭐⭐ 4 — ጥሩ",
    5: "⭐⭐⭐⭐⭐ 5 — እጅግ ጥሩ",
  },

  RATING_COMMENT: `💬 አስተያየት ይጨምሩ (ወይም /skip ይጫኑ)`,

  RATING_THANKS: `🙏 አመሰግናለን! ግምገማዎ ሌሎች ደንበኞችን ይረዳቸዋል።`,

  // ── Cancel / Help ─────────────────────────────────────────────
  CANCEL_CONFIRM: `❓ ትዕዛዙን ለመሰረዝ ይፈልጋሉ?`,
  CANCEL_YES:  "❌ አዎ፣ ሰርዝ",
  CANCEL_NO:   "← ተው",
  CANCELLED:   `❌ ትዕዛዝ ተሰርዟል።`,

  HELP:
    `❓ *እርዳታ*\n\n` +
    `/book — አዲስ ትዕዛዝ\n` +
    `/status — የትዕዛዝ ሁኔታ\n` +
    `/history — ያለፉ ትዕዛዞች\n` +
    `/cancel — ሰርዝ\n\n` +
    `ችግር ካለ: @FikirFixSupport`,

  HISTORY_EMPTY: `ምንም ያለፈ ትዕዛዝ የለዎትም።`,

  HISTORY_ITEM: (job, i) =>
    `${i + 1}. ${job.category} — ${job.status}\n` +
    `   📅 ${job.createdAt.toLocaleDateString("am-ET")}\n` +
    `   💰 ${job.finalPrice ? job.finalPrice + " ብር" : "—"}`,

  // ── Errors ────────────────────────────────────────────────────
  ERROR_GENERIC:
    `❌ ችግር ተፈጠረ። እባክዎ እንደገና ይሞክሩ ወይም /help ይጫኑ።`,

  NO_WORKER_AVAILABLE:
    `😔 አሁን ባለሙያ አልተገኘም።\n` +
    `እናሳውቅዎ ዝግጁ ሲሆኑ — ጥቂት ይጠብቁ ወይም ቆይተው ይዝዙ።`,
};

// ── Worker Bot Strings ────────────────────────────────────────────
export const AM_WORKER = {
  WELCOME: (name) =>
    `👋 ሰላም ${name}!\n\n` +
    `እንኳን ወደ *FikirFix Worker* ።\n` +
    `ትዕዛዝ ሲደርስ ወዲያው እናሳውቅዎታለን። 📲`,

  NEW_JOB_ALERT: (job) =>
    `🔔 *አዲስ ትዕዛዝ!*\n\n` +
    `🛠 ${job.category}\n` +
    `📝 ${job.description}\n` +
    `📍 ${job.address}\n` +
    `⏰ ${job.urgency === "asap" ? "አሁኑኑ ያስፈልጋል!" : job.urgency}\n` +
    `💰 ግምት: ${job.quotedPrice}`,

  ACCEPT:  "✅ ተቀበለ",
  SKIP:    "⏭ ዝለል",

  JOB_ACCEPTED: (customerPhone) =>
    `✅ ትዕዛዙን ተቀበልክ!\n\n` +
    `📞 ደንበኛ: ${customerPhone}\n` +
    `ሲደርሱ ደንበኛው አሳውቅ።`,

  MARK_ARRIVED:   "📍 ደረስኩ",
  MARK_COMPLETE:  "✅ ሥራ ጨረስኩ",

  ARRIVED_SENT: `✅ ደንበኛ ደርሰሃል ብለን አሳወቅናቸው።`,

  COMPLETE_PRICE: `💰 የሥራ ዋጋ ስንት ብር ነው? (ቁጥር ብቻ ጻፍ)`,

  JOB_DONE: (price) =>
    `🎉 ሥራ ተጠናቀቀ!\n💰 ${price} ብር ተመዝግቧል።\n\nሥራዎን እናመሰግናለን! 🙏`,

  AVAILABLE_ON:  `🟢 ለሥራ ዝግጁ ሆንህ።`,
  AVAILABLE_OFF: `🔴 ከሥራ ጊዜያዊ ወጣህ።`,

  MY_JOBS: (count, rating) =>
    `📊 *የሥራ ሪፖርት*\n\n` +
    `✅ ጠቅላላ ሥራ: ${count}\n` +
    `⭐ ደረጃ: ${rating.toFixed(1)}/5.0`,

  NO_JOBS: `ምንም ያለፈ ሥራ የለም።`,

  HELP:
    `❓ *እርዳታ*\n\n` +
    `/available — ሁኔታ ቀይር (ዝግጁ / ጊዜያዊ ዕረፍት)\n` +
    `/myjobs — የሥራ ታሪክ\n` +
    `/help — ይህ ዝርዝር\n\n` +
    `ችግር ካለ: @FikirFixSupport`,
};
