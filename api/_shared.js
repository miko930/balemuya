import { prisma } from "../src/db/client.js";
import { getBots } from "../src/bot/init.js";
import { askForRating } from "../src/handlers/customer.js";

export { prisma, askForRating };

export function getCustomerBot() {
  return getBots().customerBot;
}

export function getWorkerBot() {
  return getBots().workerBot;
}

export function getCustomerBotApi() {
  return getBots().customerBot.api;
}

export function getWorkerBotApi() {
  return getBots().workerBot.api;
}

// Helper function to send Telegram status/assignment notifications
export async function handleJobUpdateNotifications(oldJob, newJob) {
  const statusChanged = oldJob.status !== newJob.status;
  const workerChanged = oldJob.workerId !== newJob.workerId;
  const customerBotApi = getCustomerBotApi();
  const workerBotApi = getWorkerBotApi();

  // Case 1: Worker changed (assigned or reassigned)
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

  // Case 2: Status changed (but worker did not change)
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
