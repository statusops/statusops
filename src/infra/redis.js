const redis = require("redis");
const { promisify } = require("util");
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let instance = null;

const set = async (key, value, expiration = 0) => {
  await client().set(key, value);
  await client().expire(key, expiration);
};

const exists = async (key) => {
  const number = await client().exists(key);
  return number === 1;
};

const flushDb = async () => {
  await client().flushDb();
};

const quit = () => {
  client().quit();
  instance = null;
};

const publish = async (channel, message) => {
  await client().publish(channel, message);
};

const client = () => {
  if (instance) return instance;

  const redisClient = redis.createClient({ url: REDIS_URL });
  instance = {
    set: promisify(redisClient.set).bind(redisClient),
    expire: promisify(redisClient.expire).bind(redisClient),
    exists: promisify(redisClient.exists).bind(redisClient),
    publish: promisify(redisClient.publish).bind(redisClient),
    flushDb: promisify(redisClient.flushdb).bind(redisClient),
    quit: () => redisClient.quit(),
  };
  return instance;
};

module.exports = { REDIS_URL, set, exists, quit, flushDb, publish };
