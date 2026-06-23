import { webhookCallback } from "grammy";
import { workerBot } from "./_shared.js";

export default webhookCallback(workerBot, "http");
