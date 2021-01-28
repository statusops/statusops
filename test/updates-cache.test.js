const cache = require("../src/updates-cache");
const redis = require("../src/infra/redis");

describe("Updates cache", () => {
  afterEach(async () => {
    await redis.flushDb();
  });

  after(() => {
    redis.quit();
  });

  it("says when an update has been registered", async () => {
    const update = anUpdate({ title: "title" });

    await cache.register(update);

    expect(await cache.has(update)).to.be.true;
  });

  it("says when an update has not been registered", async () => {
    const update = anUpdate({ title: "title" });
    const otherUpdate = anUpdate({ title: "other" });

    await cache.register(update);

    expect(await cache.has(otherUpdate)).to.be.false;
  });

  it("considers all fields of the update to know if is the same", async () => {
    const updateA = anUpdate({ title: "title_a", serviceName: "service_a" });
    const updateAsA = anUpdate({ title: "title_a", serviceName: "service_a" });
    const other = anUpdate({ title: "title_a", serviceName: "service_b" });
    const otherIncomplete = anUpdate({ title: "title_a" });
    await cache.register(updateA);

    expect(await cache.has(updateAsA)).to.be.true;
    expect(await cache.has(other)).to.be.false;
    expect(await cache.has(otherIncomplete)).to.be.false;
  });

  it("considers correctly date field", async () => {
    const updateA = anUpdate({ date: new Date("2010") });
    const updateAsA = anUpdate({ date: new Date("2010") });
    const other = anUpdate({ date: new Date("2020") });
    await cache.register(updateA);

    expect(await cache.has(updateAsA)).to.be.true;
    expect(await cache.has(other)).to.be.false;
  });

  const anUpdate = (attributes = {}) => {
    const defaults = { date: new Date("2021") };
    return { ...defaults, ...attributes };
  };
});
