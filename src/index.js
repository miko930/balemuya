import "dotenv/config";
import { createCustomerBot } from "./bot/customerBot.js";
import { createWorkerBot }   from "./bot/workerBot.js";
import { setWorkerBotApi }   from "./bot/shared.js";

async function main() {
  console.log("🔧 FikirFix starting...");

  // Start customer bot first so we can pass its API to worker bot
  const customerBot = createCustomerBot();
  const workerBot   = createWorkerBot(customerBot.api);

  // Share worker bot API so customer-side handlers can notify workers
  setWorkerBotApi(workerBot.api);

  // Run both bots (start sequentially to avoid network race)
  customerBot.start({
    onStart: () => console.log("✅ Customer bot (@fixit43bot) is running"),
  });

  workerBot.start({
    onStart: () => console.log("✅ Worker bot (@workerfix43bot) is running"),
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
