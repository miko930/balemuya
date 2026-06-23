/**
 * Shared state between the two bots.
 * Allows the customer bot's handlers to send messages
 * via the worker bot's API (and vice versa).
 */

/** @type {import("grammy").Api | null} */
let workerBotApi = null;

export function setWorkerBotApi(api) {
  workerBotApi = api;
}

export function getWorkerBotApi() {
  return workerBotApi;
}
