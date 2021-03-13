const axios = require("axios");
const logger = require("./infra/logger");
const slack = require("./infra/slack");

const send = async (update) => {
  logger.info(`Sending update from ${update.serviceKey}...`);
  logger.debug(`Update: ${JSON.stringify(update)}`);

  sendToHttpWebhook(update);
  sendToSlackWebhook(update);
};

const sendToHttpWebhook = async (update) => {
  const url = process.env.MESSAGING_HTTP_WEBHOOK;
  if (!url) return;

  try {
    await axios.post(url, { update });
  } catch (error) {
    logger.error(`Failed to send update via http webhook, ${error.message}`);
  }
};

const sendToSlackWebhook = async (update) => {
  const slackUrl = process.env.MESSAGING_SLACK_WEBHOOK;
  if (!slackUrl) return;

  const title = `${update.serviceName} | ${update.title}`;
  const incidentLink = update.link;
  const color =
    update.status === "resolved" ? slack.COLORS.SUCCESS : slack.COLORS.WARNING;
  const componentsText = update.components
    ? `Components affected: ${update.components}`
    : null;
  const message = slack.MessageBuilder.with()
    .notificationText(title)
    .title(title, incidentLink)
    .color(color)
    .fallback(title)
    .textSection(update.description)
    .context(componentsText)
    .build();

  try {
    await slack.sendToWebhook(slackUrl, message);
  } catch (error) {
    logger.error(`Failed to send update via slack webhook,  ${error.message}`);
  }
};

module.exports = { send };
