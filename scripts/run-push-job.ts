import { runScheduledPushJob } from "../server/pushJob";

async function main() {
  const result = await runScheduledPushJob();
  console.log(`Push job complete. sent=${result.sent} pruned=${result.pruned}`);
}

main().catch((error) => {
  console.error("Push job failed:", error);
  process.exit(1);
});


