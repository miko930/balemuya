import "dotenv/config";
import { getBots } from "./bot/init.js";
import { app } from "./dashboard/server.js";

async function main() {
  console.log("🔧 FikirFix starting...");

  const { customerBot, workerBot } = getBots();

  // If webhook mode is disabled (default/local), start bots in long-polling mode
  if (process.env.USE_WEBHOOK === "true") {
    console.log("ℹ️ Webhook mode enabled. Bots will receive updates via Express endpoints.");
  } else {
    console.log("ℹ️ Long Polling mode enabled. Running bots sequentially...");
    
    customerBot.start({
      onStart: () => console.log("✅ Customer bot (@fixit43bot) is running (Long Polling)"),
    });

    workerBot.start({
      onStart: () => console.log("✅ Worker bot (@workerfix43bot) is running (Long Polling)"),
    });
  }

  // Start the unified dashboard Express server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 FikirFix unified server & dashboard running at http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal error during startup:", err);
  process.exit(1);
});

