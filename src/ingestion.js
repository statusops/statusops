const cache = require("./updates-cache");
const messaging = require("./messaging");
const { getProvider } = require("./providers");
const logger = require("./infra/logger");
const time = require("./infra/time");
const { checkValidUpdate } = require("./update");

const runIngestion = async (name, providerName, data) => {
  logger.info(`[${name}] Starting ingestion`);
  const timeWindow = createTimeWindow();
  const provider = getProvider(providerName);
  const updates = await provider.fetchRecentUpdates(data, timeWindow);
  const validUpdates = rejectInvalidUpdates(name, updates);
  const newUpdates = await filterNewUpdates(name, validUpdates);
  await publishUpdates(newUpdates);
  await cacheUpdates(newUpdates);
  logger.info(`[${name}] Finished ingestion`);
};

const rejectInvalidUpdates = (name, updates) => {
  const validUpdates = [];
  for (const update of updates) {
    const { isValid, error } = checkValidUpdate(update);
    if (!isValid) {
      logger.error(`[${name}] Skipping invalid update, reason: ${error}`);
      continue;
    }
    validUpdates.push(update);
  }
  return validUpdates;
};

const filterNewUpdates = async (name, updates) => {
  const newUpdates = [];
  for (const update of updates) {
    if (await cache.has(update)) continue;

    newUpdates.push(update);
  }
  logger.debug(`[${name}] Filtered new updates (${newUpdates.length})`);
  return newUpdates;
};

const publishUpdates = async (updates) => {
  updates.forEach((update) => {
    messaging.send(update);
  });
};

const cacheUpdates = async (updates) => {
  if (process.env.DANGER_NO_CACHE) return;
  for (const update of updates) {
    await cache.register(update);
  }
};

const createTimeWindow = () => {
  const defaultSizeMins = 5;
  const windowSize =
    process.env.INGEST_ALL_HISTORY === "true" ? 1e7 : defaultSizeMins;
  const timeWindow = time.windowFromNowMins(windowSize);
  return timeWindow;
};

module.exports = { runIngestion };
