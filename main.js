const { runIngestion } = require("./src/ingestion");
const { REDIS_URL } = require("./src/infra/redis");
const providers = require("./src/providers");
const logger = require("./src/infra/logger");
const Queue = require("bull");
const CONCURRENCY = 10;
const queue = new Queue("ingestions", REDIS_URL);

queue.process(CONCURRENCY, async (job) => {
  const { name, providerName, data } = job.data;

  await runIngestion(name, providerName, data);
});

queue.on("failed", (job) => {
  logger.error(job.failedReason);
});

const ingestions = providers.buildIngestions();
const everyMinute = "* * * * *";

logger.info("Scheduling ingestions for next minute");
for (const ingestion of ingestions) {
  queue.add(ingestion, {
    jobId: ingestion.name,
    repeat: { cron: everyMinute },
    removeOnComplete: true,
    removeOnFail: true,
  });
}
