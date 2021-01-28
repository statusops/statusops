const { IncomingWebhook } = require("@slack/webhook");
const { sendToWebhook } = require("../../src/infra/slack");
const logger = require("../../src/infra/logger");

describe("sendToWebhook", () => {
  beforeEach(() => {
    logger.mute();
  });
  afterEach(() => {
    sinon.restore();
  });

  it("sends a message to a webhook", async () => {
    sinon.stub(IncomingWebhook.prototype, "send").resolves(true);
    const webhookUrl = "WEBHOOK_URL";
    const message = "MESSAGE";

    await sendToWebhook(webhookUrl, message);

    expect(IncomingWebhook.prototype.send).to.have.been.calledWith(message);
  });

  it("retries when slack raises a 400 error", async () => {
    sinon.stub(IncomingWebhook.prototype, "send").rejects(slackHttpError(400));
    const webhookUrl = "WEBHOOK_URL";
    const message = "MESSAGE";

    await expectReject(() => sendToWebhook(webhookUrl, message));

    expect(IncomingWebhook.prototype.send).to.have.callCount(3);
  });

  it("raises other 4XX errors", async () => {
    sinon.stub(IncomingWebhook.prototype, "send").rejects(slackHttpError(403));
    const webhookUrl = "WEBHOOK_URL";
    const message = "MESSAGE";

    await expectReject(() => sendToWebhook(webhookUrl, message));
    expect(IncomingWebhook.prototype.send).to.have.callCount(1);
  });

  it("retries 500 errors", async () => {
    sinon.stub(IncomingWebhook.prototype, "send").rejects(slackHttpError(500));
    const webhookUrl = "WEBHOOK_URL";
    const message = "MESSAGE";

    await expectReject(() => sendToWebhook(webhookUrl, message));
    expect(IncomingWebhook.prototype.send).to.have.callCount(3);
  });

  it("does not retry uncontrolled errors", async () => {
    sinon.stub(IncomingWebhook.prototype, "send").rejects(new Error("ERROR"));
    const webhookUrl = "WEBHOOK_URL";
    const message = "MESSAGE";

    await expectReject(() => sendToWebhook(webhookUrl, message), "ERROR");
    expect(IncomingWebhook.prototype.send).to.have.callCount(1);
  });

  it("throws other slack status codes", async () => {
    sinon.stub(IncomingWebhook.prototype, "send").rejects(slackHttpError(503));
    const webhookUrl = "WEBHOOK_URL";
    const message = "MESSAGE";

    await expectReject(() => sendToWebhook(webhookUrl, message));
    expect(IncomingWebhook.prototype.send).to.have.callCount(1);
  });

  const slackHttpError = (status) => {
    return {
      code: "slack_webhook_http_error",
      original: {
        response: {
          status,
        },
      },
    };
  };

  const expectReject = async (asyncFunction, errorMessage) => {
    let catched;
    try {
      await asyncFunction();
    } catch (error) {
      catched = error;
    }

    expect(catched, "\nPromise did not reject").not.to.be.undefined;
    if (errorMessage) {
      expect(catched.message, "\nError message").to.contain(errorMessage);
    }
  };
});
