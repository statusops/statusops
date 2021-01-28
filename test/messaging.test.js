const sinon = require("sinon");
const sinonChai = require("sinon-chai");
const chai = require("chai");
chai.use(sinonChai);
const expect = chai.expect;
const axios = require("axios");
const messaging = require("../src/messaging");
const logger = require("../src/infra/logger");
const slack = require("../src/infra/slack");

const originalWebhook = process.env.MESSAGING_HTTP_WEBHOOK;
const originalSlackWebhook = process.env.MESSAGING_SLACK_WEBHOOK;

describe("Messaging", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("when http webhook provided", () => {
    const url = "WEBHOOK";
    before(() => {
      process.env.MESSAGING_HTTP_WEBHOOK = url;
    });

    after(() => {
      process.env.MESSAGING_HTTP_WEBHOOK = originalWebhook;
    });

    it("sends update via http", async () => {
      const update = { title: "AN_UPDATE" };
      sinon.stub(axios, "post").withArgs(url, { update }).resolves();

      await messaging.send(update);

      expect(axios.post).to.have.been.calledWith(url, { update });
    });

    it("does not crash on http failure", async () => {
      const url = "WEBHOOK";
      process.env.MESSAGING_HTTP_WEBHOOK = url;
      const update = { title: "AN_UPDATE" };
      sinon.stub(axios, "post").withArgs(url, { update }).rejects();
      sinon.spy(logger, "error");

      await messaging.send(update);

      expect(logger.error).to.have.been.called;
    });
  });

  describe("when slack webhook provided", () => {
    const slackUrl = "URL";
    before(() => {
      process.env.MESSAGING_SLACK_WEBHOOK = slackUrl;
    });

    after(() => {
      process.env.MESSAGING_SLACK_WEBHOOK = originalSlackWebhook;
    });

    it("send updates via slack", async () => {
      const update = {
        title: "TITLE",
        description: "DESC",
        status: "active",
        date: new Date("2010-10-10T10:10:10Z"),
        link: "LINK",
        components: "COMPONENTS",
        serviceName: "SERVICENAME",
      };
      sinon.spy(slack, "sendToWebhook");

      await messaging.send(update);

      const expectedMessage = {
        text: "SERVICENAME | TITLE",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*<LINK|SERVICENAME | TITLE>*",
            },
          },
        ],
        attachments: [
          {
            color: "#ffa700",
            fallback: "SERVICENAME | TITLE",
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "DESC",
                },
              },
              {
                type: "context",
                elements: [
                  {
                    type: "plain_text",
                    text: "Components affected: COMPONENTS",
                    emoji: false,
                  },
                ],
              },
            ],
          },
        ],
      };
      expect(slack.sendToWebhook).to.have.been.calledWith(
        slackUrl,
        expectedMessage
      );
    });

    it("uses a different color for resolved updates", async () => {
      const update = anUpdate({
        status: "resolved",
      });
      sinon.spy(slack, "sendToWebhook");

      await messaging.send(update);

      const successColor = "#36a64f";
      const [, message] = slack.sendToWebhook.lastCall.args;
      expect(JSON.stringify(message)).to.contain(successColor);
    });

    it("does not crash on slack failure", async () => {
      const update = anUpdate({ title: "AN_UPDATE" });
      sinon.stub(slack, "sendToWebhook").rejects(new Error("BOOM"));
      sinon.spy(logger, "error");

      await messaging.send(update);

      expect(logger.error).to.have.been.called;
    });
  });

  const anUpdate = (attributes = {}) => {
    const defaults = {
      title: "A_TITLE",
      serviceName: "A_SERVICE",
      serviceKey: "A_SERVICE",
      description: "A_DESCRIPTION",
      link: "A_LINK",
      status: "active",
      date: new Date("2020-10-10"),
      incidentReference: "REFERENCE",
    };
    return {
      ...defaults,
      ...attributes,
    };
  };
});
