import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../db/client.js";
import "dotenv/config";
import { webhookCallback } from "grammy";
import { askForRating } from "../handlers/customer.js";
import { getBots } from "../bot/init.js";

const { customerBot, workerBot } = getBots();
const customerBotApi = customerBot.api;
const workerBotApi = workerBot.api;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve dashboard static files from root /public folder
const publicDir = path.join(__dirname, "..", "..", "public");
app.use(express.static(publicDir));

// ── GET /api/stats ───────────────────────────────────────────
app.get("/api/stats", async (req, res) => {
  try {
    const totalJobs = await prisma.job.count();
    const activeJobs = await prisma.job.count({
      where: { status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] } },
    });
    const completedJobs = await prisma.job.count({
      where: { status: "COMPLETED" },
    });
    const disputedJobs = await prisma.job.count({
      where: { status: "DISPUTED" },
    });

    const revenueAggregate = await prisma.job.aggregate({
      where: { status: "COMPLETED" },
      _sum: { finalPrice: true },
    });
    const totalRevenue = revenueAggregate._sum.finalPrice || 0;

    const ratingAggregate = await prisma.rating.aggregate({
      _avg: { score: true },
    });
    const avgRating = ratingAggregate._avg.score || 5.0;

    res.json({
      totalJobs,
      activeJobs,
      completedJobs,
      disputedJobs,
      totalRevenue,
      avgRating: parseFloat(avgRating.toFixed(1)),
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/jobs and PATCH /api/jobs?id=X ────────────────────
app.get("/api/jobs", async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const jobs = await prisma.job.findMany({
      where: filter,
      include: {
        customer: true,
        worker: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(jobs);
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/jobs", async (req, res) => {
  try {
    const jobId = parseInt(req.query.id, 10);
    if (!jobId) {
      return res.status(400).json({ error: "Missing job id query parameter" });
    }

    const { status, finalPrice, workerId } = req.body;

    const data = {};
    if (status) data.status = status;
    if (finalPrice !== undefined) data.finalPrice = finalPrice !== null ? parseInt(finalPrice, 10) : null;
    if (workerId !== undefined) data.workerId = workerId !== null ? parseInt(workerId, 10) : null;

    const oldJob = await prisma.job.findUnique({
      where: { id: jobId },
      include: { customer: true, worker: true },
    });

    if (!oldJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data,
      include: { customer: true, worker: true },
    });

    handleJobUpdateNotifications(oldJob, updatedJob).catch((err) => {
      console.error("Failed to run status change notifications:", err);
    });

    res.json(updatedJob);
  } catch (error) {
    console.error("Failed to update job:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/workers, PATCH /api/workers?id=X, PUT /api/workers?id=X ──
app.get("/api/workers", async (req, res) => {
  try {
    const workers = await prisma.worker.findMany({
      orderBy: { firstName: "asc" },
      include: {
        ratings: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
    res.json(workers);
  } catch (error) {
    console.error("Failed to fetch workers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/workers", async (req, res) => {
  try {
    const workerId = parseInt(req.query.id, 10);
    if (!workerId) {
      return res.status(400).json({ error: "Missing worker id query parameter" });
    }

    const { isAvailable, isVerified } = req.body;

    const data = {};
    if (isAvailable !== undefined) data.isAvailable = isAvailable;
    if (isVerified !== undefined) data.isVerified = isVerified;

    const updatedWorker = await prisma.worker.update({
      where: { id: workerId },
      data,
    });

    res.json(updatedWorker);
  } catch (error) {
    console.error("Failed to update worker:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/workers", async (req, res) => {
  try {
    const workerId = parseInt(req.query.id, 10);
    if (!workerId) {
      return res.status(400).json({ error: "Missing worker id query parameter" });
    }

    const { firstName, phone, subCity, category } = req.body;

    if (!phone || !subCity || !category || !Array.isArray(category) || category.length === 0) {
      return res.status(400).json({ error: "Phone, sub-city, and at least one specialty are required" });
    }

    const data = {
      phone: phone.trim(),
      subCity: subCity.trim(),
      category,
      isVerified: true,
      isAvailable: true,
    };
    if (firstName) data.firstName = firstName.trim();

    const updatedWorker = await prisma.worker.update({
      where: { id: workerId },
      data,
    });

    res.json(updatedWorker);
  } catch (error) {
    console.error("Failed to activate worker:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Telegram Notification Helper ──────────────────────────────
async function handleJobUpdateNotifications(oldJob, newJob) {
  const statusChanged = oldJob.status !== newJob.status;
  const workerChanged = oldJob.workerId !== newJob.workerId;

  if (workerChanged) {
    if (oldJob.worker) {
      try {
        await workerBotApi.sendMessage(
          oldJob.worker.telegramId,
          `ℹ️ *ትዕዛዝ #${newJob.id} ከእርስዎ ተነስቷል።*`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("Failed to notify old worker of removal:", err.message);
      }
    }

    if (newJob.worker) {
      try {
        await workerBotApi.sendMessage(
          newJob.worker.telegramId,
          `📋 *አዲስ ትዕዛዝ ተመድቦልዎታል! (ትዕዛዝ #${newJob.id})*\n\n` +
          `🛠 Category: ${newJob.category}\n` +
          `👤 ደንበኛ: ${newJob.customer.firstName}\n` +
          `📞 ስልክ: ${newJob.customer.phone || "—"}\n` +
          `📍 አድራሻ: ${newJob.address}\n\n` +
          `እባክዎን ወዲያውኑ ወደ ደንበኛው ያምሩ። 🏃`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("Failed to notify new worker of assignment:", err.message);
      }
    }

    if (newJob.customer) {
      try {
        let msg = "";
        if (newJob.worker) {
          msg = `✅ *ባለሙያ ተቀይሯል/ተመድቧል!*\n\n` +
                `👷 ስም: *${newJob.worker.firstName}*\n` +
                `📞 ስልክ: ${newJob.worker.phone || "—"}\n` +
                `📍 ክፍለ ከተማ: ${newJob.worker.subCity || "—"}\n\n` +
                `ባለሙያው በቅርቡ ይደርሳሉ። 🏃`;
        } else {
          msg = `⏳ *የተመደበው ባለሙያ ተነስቷል። አዲስ ባለሙያ እስኪመደብ ይጠብቁ።*`;
        }
        await customerBotApi.sendMessage(newJob.customer.telegramId, msg, { parse_mode: "Markdown" });
      } catch (err) {
        console.error("Failed to notify customer of worker change:", err.message);
      }
    }
  }

  if (statusChanged && !workerChanged) {
    if (newJob.customer) {
      let customerMsg = "";
      switch (newJob.status) {
        case "PENDING":
          customerMsg = `⏳ *ትዕዛዝዎ ወደ መጠበቂያ ተመልሷል።*`;
          break;
        case "ASSIGNED":
          if (newJob.worker) {
            customerMsg = `✅ *ባለሙያ ተመድቧል!*\n\n👷 ስም: *${newJob.worker.firstName}*\n📞 ስልክ: ${newJob.worker.phone || "—"}\n📍 ክፍለ ከተማ: ${newJob.worker.subCity || "—"}\n\nባለሙያው በቅርቡ ይደርሳሉ። 🏃`;
          } else {
            customerMsg = `✅ *ባለሙያ በመመደብ ላይ ነው!*`;
          }
          break;
        case "IN_PROGRESS":
          customerMsg = `🔧 *ባለሙያው ሥራ ጀምረዋል!*`;
          break;
        case "COMPLETED":
          customerMsg = `✅ *ሥራው በተሳካ ሁኔታ ተጠናቋል!*\n💰 የተከፈለ: ${newJob.finalPrice || "—"} ብር\n\nFikirFix ስለ አገልጋሉ እናመሰግናለን! 🙏`;
          break;
        case "CANCELLED":
          customerMsg = `❌ *ትዕዛዝዎ ተሰርዟል!*`;
          break;
        case "DISPUTED":
          customerMsg = `⚠️ *ትዕዛዝዎ በአከራካሪ ሁኔታ ላይ ነው!*\n\nአስተዳዳሪው ሁኔታውን እያጣራ ነው። በቅርቡ እናነጋግርዎታለን።`;
          break;
      }
      if (customerMsg) {
        try {
          await customerBotApi.sendMessage(newJob.customer.telegramId, customerMsg, { parse_mode: "Markdown" });
          if (newJob.status === "COMPLETED") {
            await askForRating(customerBotApi, newJob);
          }
        } catch (err) {
          console.error("Failed to notify customer of status change:", err.message);
        }
      }
    }

    if (newJob.worker) {
      let workerMsg = "";
      switch (newJob.status) {
        case "IN_PROGRESS":
          workerMsg = `🔧 *ትዕዛዝ #${newJob.id} ጀምረዋል።*`;
          break;
        case "COMPLETED":
          workerMsg = `✅ *ትዕዛዝ #${newJob.id} ተጠናቋል።*\n💰 የተከፈለበት ዋጋ: ${newJob.finalPrice || "—"} ብር`;
          break;
        case "CANCELLED":
          workerMsg = `❌ *ትዕዛዝ #${newJob.id} ተሰርዟል!*`;
          break;
        case "DISPUTED":
          workerMsg = `⚠️ *ትዕዛዝ #${newJob.id} ቅሬታ ቀርቦበታል!*\n\nአስተዳዳሪው እያጣራው ነው።`;
          break;
      }
      if (workerMsg) {
        try {
          await workerBotApi.sendMessage(newJob.worker.telegramId, workerMsg, { parse_mode: "Markdown" });
        } catch (err) {
          console.error("Failed to notify worker of status change:", err.message);
        }
      }
    }
  }
}

// ── Webhook endpoints (only when USE_WEBHOOK is true) ─────────
if (process.env.USE_WEBHOOK === "true") {
  console.log("ℹ️ Webhook mode enabled. Registering endpoints...");
  app.use("/api/webhook-customer", webhookCallback(customerBot, "express"));
  app.use("/api/webhook-worker", webhookCallback(workerBot, "express"));
}

// Webhook setup endpoint
app.get("/api/setup-webhook", async (req, res) => {
  try {
    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) {
      return res.status(400).json({ error: "WEBHOOK_URL is not set" });
    }

    await customerBot.api.setWebhook(`${webhookUrl}/api/webhook-customer`);
    await workerBot.api.setWebhook(`${webhookUrl}/api/webhook-worker`);

    res.json({
      success: true,
      message: "Webhooks registered",
      urls: {
        customer: `${webhookUrl}/api/webhook-customer`,
        worker: `${webhookUrl}/api/webhook-worker`,
      },
    });
  } catch (error) {
    console.error("Failed to setup webhooks:", error);
    res.status(500).json({ error: error.message });
  }
});

// Fallback — serve index.html for SPA
app.get("/*splat", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// Export app for imports
export { app };

// Only listen if this file is run directly
if (process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith("server.js"))) {
  app.listen(PORT, () => {
    console.log(`🚀 FikirFix Admin Dashboard is running at http://localhost:${PORT}`);
  });
}
