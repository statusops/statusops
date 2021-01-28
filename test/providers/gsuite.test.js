const Feed = require("../../src/infra/feed");
const logger = require("../../src/infra/logger");
const {
  buildIngestions,
  fetchRecentUpdates,
} = require("../../src/providers/gsuite");

describe("GSuite", () => {
  describe("fetchRecentUpdates", () => {
    beforeEach(() => {
      logger.mute();
    });
    afterEach(() => {
      sinon.restore();
    });

    const feedUrl = "URL";

    it("provides an update for a given service", async () => {
      const item = anItem({
        title: "SERVICE_A",
        description:
          "<p><small></small><strong>Investigating</strong> - Description</p>",
        pubdate: new Date(),
        link: "LINK",
      });
      const services = [{ name: "SERVICE_A", key: "service-a" }];
      stubFeedItems(feedUrl, [item]);

      const updates = await fetchRecentUpdates(
        {
          feedUrl,
          services,
        },
        wideTimeWindow
      );

      expect(updates).to.have.lengthOf(1);
      const update = updates[0];
      expect(update.title).to.equal(item.title);
      expect(update.description).to.equal("Investigating - Description");
      expect(update.date).to.equal(item.pubdate);
      expect(update.link).to.equal(item.link);
      expect(update.serviceName).to.equal(item.title);
      expect(update.serviceKey).to.equal("service-a");
    });

    it("can provide multiple updates", async () => {
      stubFeedItems(feedUrl, [anItem(), anItem()]);

      const updates = await fetchRecentUpdates(
        {
          feedUrl,
          services: defaultServices,
        },
        wideTimeWindow
      );

      expect(updates).to.have.lengthOf(2);
    });

    it("parses the latest update", async () => {
      const description =
        "<p><img/>LATEST_UPDATE</p><p><img/>PREVIOUS UPDATE</p>";
      const item = anItem({
        description,
      });
      stubFeedItems(feedUrl, [item]);

      const updates = await fetchRecentUpdates(
        {
          feedUrl,
          services: defaultServices,
        },
        wideTimeWindow
      );

      expect(updates[0].description).to.equal("LATEST_UPDATE");
    });

    it("assigns by default active status", async () => {
      const item = anItem({
        description: "<p>TEXT</p>",
      });
      stubFeedItems(feedUrl, [item]);

      const updates = await fetchRecentUpdates(
        {
          feedUrl,
          services: defaultServices,
        },
        wideTimeWindow
      );

      expect(updates[0].status).to.equal("active");
    });

    it("assigns resolved status when the description contains a keyword", async () => {
      const item = anItem({
        description: "<p><img src='img/blue.gif'>TEXT</p>",
      });
      stubFeedItems(feedUrl, [item]);

      const updates = await fetchRecentUpdates(
        {
          feedUrl,
          services: defaultServices,
        },
        wideTimeWindow
      );

      expect(updates[0].status).to.equal("resolved");
    });

    it("ignores services that are not supported", async () => {
      const items = [
        anItem({ title: "SUPPORTED" }),
        anItem({ title: "UNSUPPORTED" }),
      ];
      const services = [{ name: "SUPPORTED", key: "supported" }];
      stubFeedItems(feedUrl, items);

      const updates = await fetchRecentUpdates(
        {
          feedUrl,
          services,
        },
        wideTimeWindow
      );

      expect(updates).to.have.lengthOf(1);
      expect(updates[0].title).to.equal("SUPPORTED");
    });

    it("has no incident reference", async () => {
      stubFeedItems(feedUrl, [anItem()]);

      const updates = await fetchRecentUpdates(
        {
          feedUrl,
          services: defaultServices,
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
        title: "SERVICE-NAME",
        description: "A_DESC",
        pubdate: new Date("2010-10-10T10:10:10.000Z"),
        link: "A_LINK",
      };
      return { ...defaults, ...attributes };
    };

    const defaultServices = [{ name: "SERVICE-NAME", key: "service-key" }];
    const wideTimeWindow = { start: new Date("1900"), end: new Date("2100") };
  });

  describe("buildIngestions", () => {
    it("provides ingestion descriptors from services list", () => {
      const services = [
        {
          name: "SERVICE_NAME",
          key: "service_key",
        },
        {
          name: "SERVICE_NAME",
          key: "service_key",
        },
      ];

      const ingestions = buildIngestions(services);

      expect(ingestions).to.have.lengthOf(1);
      const ingestion = ingestions[0];
      expect(ingestion.name).to.equal("gsuite");
      expect(ingestion.providerName).to.equal("gsuite");
      expect(ingestion.data.feedUrl).to.equal(
        "https://www.google.com/appsstatus/rss/en"
      );
      expect(ingestion.data.services).to.equal(services);
    });
  });
});
