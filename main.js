const { runIngestion } = require("./src/ingestion");
const { REDIS_URL } = require("./src/infra/redis");
const providers = require("./src/providers");
const logger = require("./src/infra/logger");
const axios = require('axios')
const Queue = require("bull");
const { captureException } = require("./src/infra/exceptions");

const scheduleIngestions = () => {
  const concurrency = 10;
  const queue = new Queue("ingestions", REDIS_URL);
  queue.process(concurrency, async (job) => {
    const { name, providerName, data } = job.data;

    await runIngestion(name, providerName, data);
  });

  queue.on("failed", (job) => {
    const error = new Error(job.failedReason);
    captureException(error);
    logger.error(job.failedReason);
  });

  providers.loadFromConfig();

  if (!process.env.SERVICES) {
    throw new Error("SERVICES configuration is missing");
  }
  const serviceKeys = process.env.SERVICES.split(",");

  const ingestions = providers.buildIngestions(serviceKeys);
  const everyMinute = "* * * * *";

  logger.info(`Scheduling ingestions ${ingestions.length} for next minute`);
  for (const ingestion of ingestions) {
    queue.add(ingestion, {
      jobId: ingestion.name,
      repeat: { cron: everyMinute },
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
};

const scheduleHeartbeat = () => {
  const heartbeatUrl = process.env.HEARTBEAT_URL;
  if (!heartbeatUrl) return;

  const concurrency = 1;
  const queue = new Queue("heartbeat", REDIS_URL);
  queue.process(concurrency, async () => {
    try {
      await axios.get(heartbeatUrl);
    } catch (error) {
      captureException(error);
      logger.error(`Failed to send heartbeat to ${heartbeatUrl}: ${error.message}`);
    }
  });

  const everyMinute = "* * * * *";
  logger.info(`Scheduling heartbeats`);
  queue.add(
    {},
    {
      jobId: "heartbeat",
      repeat: { cron: everyMinute },
      removeOnComplete: true,
      removeOnFail: true,
    }
  );
};

scheduleIngestions();
scheduleHeartbeat();
