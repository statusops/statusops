const sinon = require("sinon");
const sinonChai = require("sinon-chai");
const chai = require("chai");
chai.use(sinonChai);
const expect = chai.expect;
const axios = require("axios");
const messaging = require("../src/messaging");
const logger = require("../src/infra/logger");

const originalWebhook = process.env.MESSAGING_WEBHOOK;

describe("Messaging", () => {
  afterEach(() => {
    sinon.restore();
  });
  after(() => {
    process.env.MESSAGING_WEBHOOK = originalWebhook;
  });

  it("sends update via http", async () => {
    const url = "WEBHOOK";
    process.env.MESSAGING_WEBHOOK = url;
    const update = { title: "AN_UPDATE" };
    sinon.stub(axios, "post").withArgs(url, { update }).resolves();

    await messaging.send(update);

    expect(axios.post).to.have.been.calledWith(url, { update });
  });

  it("does not crash on http failure", async () => {
    const url = "WEBHOOK";
    process.env.MESSAGING_WEBHOOK = url;
    const update = { title: "AN_UPDATE" };
    sinon.stub(axios, "post").withArgs(url, { update }).rejects();
    sinon.spy(logger, "error");

    await messaging.send(update);

    expect(logger.error).to.have.been.called;
  });
});
