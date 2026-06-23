import { customerBot, workerBot } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) {
      return res.status(400).json({ error: "WEBHOOK_URL is not set in environment variables" });
    }

    console.log(`Registering webhooks at URL: ${webhookUrl}`);
    await customerBot.api.setWebhook(`${webhookUrl}/api/webhook-customer`);
    await workerBot.api.setWebhook(`${webhookUrl}/api/webhook-worker`);

    res.json({
      success: true,
      message: "Webhooks successfully registered with Telegram",
      urls: {
        customer: `${webhookUrl}/api/webhook-customer`,
        worker: `${webhookUrl}/api/webhook-worker`,
      },
    });
  } catch (error) {
    console.error("Failed to setup webhooks:", error);
    res.status(500).json({ error: error.message });
  }
}
