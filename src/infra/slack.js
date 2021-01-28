const { IncomingWebhook } = require("@slack/webhook");
const striptags = require("striptags");
const logger = require("./logger");
const MAX_ATTEMPTS = 3;
const SLACK_HTTP_ERROR = "slack_webhook_http_error";
const ERRORS = {
  INVALID_PAYLOAD_OR_USER: 400,
  FORBIDDEN: 403,
  CHANNEL_NOT_FOUND: 404,
  CHANNEL_ARCHIVED: 410,
  SERVER_ERROR: 500,
};
const RETRIABLES = [ERRORS.INVALID_PAYLOAD_OR_USER, ERRORS.SERVER_ERROR];
const INVALID_WEBHOOK_CODES = [
  ERRORS.FORBIDDEN,
  ERRORS.CHANNEL_NOT_FOUND,
  ERRORS.CHANNEL_ARCHIVED,
];
const INTERVAL = 50;
const TEXT_MAX_LENGTH = 3000;
const TRUNCATED =
  "...\n\nTHIS MESSAGE HAS BEEN TRUNCATED. VISIT SOURCE FOR FULL DETAILS.";
const UNSUPPORTED = ".svg";
const COLORS = {
  SUCCESS: "#36a64f",
  WARNING: "#ffa700",
};

const sendToWebhook = async (webhookUrl, message, attempts = MAX_ATTEMPTS) => {
  try {
    const webhook = new IncomingWebhook(webhookUrl);
    await webhook.send(message);
  } catch (error) {
    if (error.code !== SLACK_HTTP_ERROR) throw error;

    return handleSlackError(error, webhookUrl, message, attempts);
  }
};

const handleSlackError = async (error, webhookUrl, message, attempts) => {
  const { status } = error.original.response;
  if (RETRIABLES.includes(status) && attempts - 1 > 0) {
    logger.warn(
      `Failed to send to slack (${status}). Retrying... (${attempts})`
    );
    await sleep(INTERVAL);
    return sendToWebhook(webhookUrl, message, attempts - 1);
  }
  if (INVALID_WEBHOOK_CODES.includes(status)) {
    throw InvalidWebhook.from(error);
  }
  throw error;
};

const sleep = (interval) =>
  new Promise((resolve) => setTimeout(resolve, interval));

class MessageBuilder {
  static with() {
    return new MessageBuilder();
  }

  constructor() {
    this._message = {};
    this._attachment = {};
  }

  notificationText(text) {
    this._message.text = text;

    return this;
  }

  title(title, link) {
    this._addBlock({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*<${link}|${title}>*`,
      },
    });
    return this;
  }

  color(color) {
    this._attachment.color = color;
    return this;
  }

  fallback(fallback) {
    this._attachment.fallback = fallback;
    return this;
  }

  imageSection(text, imageUrl, altText) {
    this._addAttachmentBlock({
      type: "section",
      text: {
        type: "mrkdwn",
        text: this._safeText(text),
      },
      accessory: {
        type: "image",
        image_url: this._safeIcon(imageUrl),
        alt_text: altText,
      },
    });
    return this;
  }

  context(text) {
    if (!text) return this;

    this._addAttachmentBlock({
      type: "context",
      elements: [
        {
          type: "plain_text",
          text: this._safeText(text),
          emoji: false,
        },
      ],
    });
    return this;
  }

  textSection(text) {
    this._addAttachmentBlock({
      type: "section",
      text: {
        type: "mrkdwn",
        text: this._safeText(text),
      },
    });
    return this;
  }

  action(attributes) {
    this._addAttachmentBlock({
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: attributes.id,
          text: {
            type: "plain_text",
            text: attributes.label,
            emoji: false,
          },
          value: attributes.value,
        },
      ],
    });
    return this;
  }

  build() {
    return {
      ...this._message,
      attachments: [this._attachment],
    };
  }

  _addBlock(data) {
    if (!this._message.blocks) {
      this._message.blocks = [];
    }

    this._message.blocks.push(data);
  }

  _addAttachmentBlock(data) {
    if (!this._attachment.blocks) {
      this._attachment.blocks = [];
    }

    this._attachment.blocks.push(data);
  }

  _safeText(text) {
    const noHtml = (text) => {
      let result = text
        .replace(/<br>/gi, "\n")
        .replace(/<p>/gi, "\n")
        .replace(/<\/p>/gi, "\n");
      const anyOtherTag = [];
      result = striptags(result, anyOtherTag, "");

      return result;
    };

    const truncate = (text) => {
      if (text.length <= TEXT_MAX_LENGTH) return text;

      return text.substring(0, TEXT_MAX_LENGTH - TRUNCATED.length) + TRUNCATED;
    };

    return truncate(noHtml(text));
  }

  _safeIcon(icon) {
    if (icon.endsWith(UNSUPPORTED))
      throw new Error(`Invalid icon extension ${icon}`);

    return icon;
  }
}

class InvalidWebhook extends Error {
  static from(slackError) {
    return new InvalidWebhook(slackError.message);
  }

  constructor(message) {
    super(message);
    this.code = "invalid_webhook";
    this.name = "InvalidWebhook";
  }
}

module.exports = {
  sendToWebhook,
  InvalidWebhook,
  MessageBuilder,
  COLORS,
};
