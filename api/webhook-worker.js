import { webhookCallback } from "grammy";
import { getWorkerBot } from "./_shared.js";

let callback;

export default async function handler(req, res) {
  if (!callback) {
    const workerBot = getWorkerBot();
    callback = webhookCallback(workerBot, "http");
  }
  return callback(req, res);
}
