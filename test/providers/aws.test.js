const Feed = require("../../src/infra/feed");
const logger = require("../../src/infra/logger");
const {
  buildIngestions,
  fetchRecentUpdates,
} = require("../../src/providers/aws");

describe("AWs", () => {
  describe("fetchRecentUpdates", () => {
    beforeEach(() => {
      logger.mute();
    });
    afterEach(() => {
      sinon.restore();
    });

    const feedUrl = "URL";
    const serviceName = "SERVICE_NAME";
    const serviceKey = "SERVICE_KEY";

    it("provides an update for a given service", async () => {
      const item = anItem({
        title: "TITLE",
        description:
          "<p><small></small><strong>Investigating</strong> - Description</p>",
        pubdate: new Date(),
        link: "LINK",
      });
      stubFeedItems(feedUrl, [item]);

      const updates = await fetchRecentUpdates(
        {
          feedUrl,
          serviceName,
          serviceKey,
        },
        wideTimeWindow
      );

      expect(updates).to.have.lengthOf(1);
      const update = updates[0];
      expect(update.title).to.equal(item.title);
      expect(update.description).to.equal("Investigating - Description");
      expect(update.date).to.equal(item.pubdate);
      expect(update.link).to.equal(item.link);
      expect(update.serviceName).to.equal(serviceName);
      expect(update.serviceKey).to.equal(serviceKey);
    });

    it("only considers last update", async () => {
      const lastUpdate = anItem({ title: "LAST", pubdate: new Date("2020") });
      const previousUpdate = anItem({
        title: "PREVIOUS",
        pubdate: new Date("2010"),
      });
      stubFeedItems(feedUrl, [previousUpdate, lastUpdate]);

      const updates = await fetchRecentUpdates(
        {
          feedUrl,
          serviceName,
          serviceKey,
        },
        wideTimeWindow
      );

      expect(updates).to.have.lengthOf(1);
      expect(updates[0].title).to.equal("LAST");
    });

    it("assigns by default active status", async () => {
      const item = anItem();
      stubFeedItems(feedUrl, [item]);

      const updates = await fetchRecentUpdates(
        {
          feedUrl,
          serviceName,
          serviceKey,
        },
        wideTimeWindow
      );

      expect(updates[0].status).to.equal("active");
    });

    it("assigns resolved status when title contains a keyword", async () => {
      const item = anItem({
        title: "TITLE [RESOLVED]",
      });
      stubFeedItems(feedUrl, [item]);

      const updates = await fetchRecentUpdates(
        {
          feedUrl,
          serviceName,
          serviceKey,
        },
        wideTimeWindow
      );

      expect(updates[0].status).to.equal("resolved");
    });

    it("has no incident reference", async () => {
      stubFeedItems(feedUrl, [anItem()]);

      const updates = await fetchRecentUpdates(
        {
          feedUrl,
          serviceName,
          serviceKey,
        },
        wideTimeWindow
      );

      expect(updates[0].incidentReference).to.be.null;
    });

    const stubFeedItems = (feedUrl, items) => {
      sinon.stub(Feed, "fetchItems").withArgs(feedUrl).returns(items);
    };

    const anItem = (attributes = {}) => {
      const defaults = {
        title: "A_TITLE",
        description: "A_DESC",
        pubdate: new Date("2010-10-10T10:10:10.000Z"),
        link: "A_LINK",
      };
      return { ...defaults, ...attributes };
    };
    const wideTimeWindow = { start: new Date("1900"), end: new Date("2100") };
  });

  describe("buildIngestions", () => {
    it("provides ingestion descriptors from services list", () => {
      const services = [
        {
          name: "SERVICE_NAME",
          key: "service_key",
          ingestion: {
            feedUrl: "FEED_URL",
          },
        },
      ];

      const ingestions = buildIngestions(services);

      expect(ingestions).to.have.lengthOf(1);
      const ingestion = ingestions[0];
      expect(ingestion.name).to.equal("service_key@aws");
      expect(ingestion.providerName).to.equal("aws");
      expect(ingestion.data.feedUrl).to.equal("FEED_URL");
      expect(ingestion.data.serviceName).to.equal("SERVICE_NAME");
      expect(ingestion.data.serviceKey).to.equal("service_key");
    });
  });
});
