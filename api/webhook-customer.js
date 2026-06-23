import { webhookCallback } from "grammy";
import { getCustomerBot } from "./_shared.js";

let callback;

export default async function handler(req, res) {
  if (!callback) {
    const customerBot = getCustomerBot();
    callback = webhookCallback(customerBot, "http");
  }
  return callback(req, res);
}
