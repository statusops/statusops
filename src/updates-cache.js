const redis = require("./infra/redis");
const md5 = require("md5");
const EXPIRATION = 60 * 5;

const register = async (update) => {
  await redis.set(keyFor(update), true, EXPIRATION);
};

const has = (update) => {
  return redis.exists(keyFor(update));
};

const keyFor = (update) => {
  const hash = md5(JSON.stringify(update));
  return `update_${hash}`;
};

module.exports = { register, has };
