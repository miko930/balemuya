import { webhookCallback } from "grammy";
import { customerBot } from "./_shared.js";

export default webhookCallback(customerBot, "http");
