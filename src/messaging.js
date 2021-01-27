const axios = require("axios");
const logger = require("../src/infra/logger");

const send = async (update) => {
  const url = process.env.MESSAGING_WEBHOOK;
  if (!url) {
    logger.warn("Messaging webhook is missing, skipping...");
    return;
  }
  try {
    await axios.post(url, { update });
  } catch (error) {
    logger.error(`Failed to send update via webhook ${url}, ${error.message}`);
  }
};

module.exports = { send };
