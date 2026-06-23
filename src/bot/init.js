import { createCustomerBot } from "./customerBot.js";
import { createWorkerBot } from "./workerBot.js";
import { setWorkerBotApi } from "./shared.js";

let customerBot = null;
let workerBot = null;

/**
 * Initializes and returns the singleton bot instances.
 * Ensures cross-referencing and shared APIs are properly set up.
 */
export function getBots() {
  if (!customerBot || !workerBot) {
    customerBot = createCustomerBot();
    workerBot = createWorkerBot(customerBot.api);
    setWorkerBotApi(workerBot.api);
  }
  return { customerBot, workerBot };
}
