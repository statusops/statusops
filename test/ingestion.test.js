const sinon = require("sinon");
const sinonChai = require("sinon-chai");
const chai = require("chai");
chai.use(sinonChai);
const expect = chai.expect;
const messaging = require("../src/messaging");
const redis = require("../src/infra/redis");
const { runIngestion } = require("../src/ingestion");
const { registerProvider } = require("../src/providers");
const logger = require("../src/infra/logger");
const { stubNow, restoreNow } = require("../src/infra/time");
const { anUpdate } = require("./_helpers/updates");

describe("runIngestion", () => {
  const timeWindow = {
    start: new Date("2020-10-10T10:10:00Z"),
    end: new Date("2020-10-10T10:15:00Z"),
  };

  beforeEach(() => {
    logger.mute();
    stubNow(timeWindow.end);
  });

  afterEach(async () => {
    sinon.restore();
    await redis.flushDb();
    restoreNow();
  });

  after(() => {
    redis.quit();
  });

  it("notifies of fetched updateds", async () => {
    const name = "ANY_NAME";
    const providerName = "TEST_PROVIDER";
    const fetchRecentFn = sinon.stub();
    const updateA = anUpdate({ title: "A" });
    const updateB = anUpdate({ title: "B" });
    const data = { aKey: "aValue" };
    fetchRecentFn.returns([updateA, updateB]);
    sinon.spy(messaging, "send");

    registerProvider(providerName, { fetchRecentUpdates: fetchRecentFn });
    await runIngestion(name, providerName, data);

    expect(fetchRecentFn).to.have.been.calledWith(data, timeWindow);
    expect(messaging.send).to.have.been.calledTwice;
    expect(messaging.send).to.have.been.calledWith(updateA);
    expect(messaging.send).to.have.been.calledWith(updateB);
  });

  it("ensures updates are not processed twice", async () => {
    const name = "ANY_NAME";
    const providerName = "TEST_PROVIDER";
    const fetchRecentFn = sinon.stub();
    const update = anUpdate({ title: "A" });
    const data = { aKey: "aValue" };
    fetchRecentFn.returns([update]);
    sinon.spy(messaging, "send");

    registerProvider(providerName, { fetchRecentUpdates: fetchRecentFn });
    await runIngestion(name, providerName, data);
    await runIngestion(name, providerName, data);

    expect(messaging.send).to.have.been.calledOnce;
  });

  it("skips invalid updates", async () => {
    const name = "ANY_NAME";
    const providerName = "TEST_PROVIDER";
    const fetchRecentFn = sinon.stub();
    const validUpdate = anUpdate({ status: "active" });
    const invalidUpdate = anUpdate({ status: "NOT_VALID" });
    const data = { aKey: "aValue" };
    fetchRecentFn.returns([invalidUpdate, validUpdate]);
    sinon.spy(messaging, "send");

    registerProvider(providerName, { fetchRecentUpdates: fetchRecentFn });
    await runIngestion(name, providerName, data);
    await runIngestion(name, providerName, data);

    expect(messaging.send).to.have.been.calledWith(validUpdate);
    expect(messaging.send).not.to.have.been.calledWith(invalidUpdate);
  });
});
