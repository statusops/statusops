const Feed = require("../../src/infra/feed");
const logger = require("../../src/infra/logger");
const {
  buildIngestions,
  fetchRecentUpdates,
} = require("../../src/providers/paypal");

describe("Paypal", () => {
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
      expect(update.description).to.contain("Investigating - Description");
      expect(update.date).to.equal(item.pubdate);
      expect(update.link).to.equal(item.link);
      expect(update.serviceName).to.equal(serviceName);
      expect(update.serviceKey).to.equal(serviceKey);
    });

    it("can provide multiple updates", async () => {
      stubFeedItems(feedUrl, [anItem(), anItem()]);

      const updates = await fetchRecentUpdates(
        {
          feedUrl,
          serviceName,
          serviceKey,
        },
        wideTimeWindow
      );

      expect(updates).to.have.lengthOf(2);
    });

    it("parses the last update with multiple stages", async () => {
      const description =
        "<br /><strong>Completed: </strong> <br /> <p><span>The scheduled maintenance has been completed.</span></p><br /><small>Nov 4, 18:30 UTC</small><br /><br /><strong>Update: </strong> <p><span>The scheduled maintenance has started, please refer to information in Initial Notification below for details.</span></p><br /><small>Nov 4, 18:07 UTC</small><br /><br /><strong>Initial Notification: </strong> <p><span>Maintenance Event Summary: Please be advised that Paydiant engineers will be performing emergency production environment maintenance on 04-November-2020 from 1:00 PM ET - 3:00 PM ET.</span></p><p><br /></p><p><span>Service(s) Affected: Paydiant Production Environment</span></p><p><br /></p><p><span>Region(s) Affected: All</span></p><p><br /></p><p><span>Action(s) Required: None</span></p><p><br /></p><p><span>Expected Impact: There is no downtime planned or anticipated during this </span><span>maintenance</span><span> event window.</span></p><br /><small>Nov 3, 00:09 UTC</small><br />";

      const item = anItem({ description });
      stubFeedItems(feedUrl, [item]);

      const updates = await fetchRecentUpdates(
        {
          feedUrl,
          serviceName,
          serviceKey,
        },
        wideTimeWindow
      );

      expect(updates[0].description).to.equal(
        "Completed:   The scheduled maintenance has been completed."
      );
    });

    it("assigns by default active status", async () => {
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

      expect(updates[0].status).to.equal("active");
    });

    it("assigns resolved status when the description contains a keyword", async () => {
      const item = anItem({
        title: "TITLE",
        description:
          "<p><small></small><strong>Resolved: </strong> - Description</p>",
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

      expect(updates[0].status).to.equal("resolved");
    });

    it("uses incident link as reference", async () => {
      stubFeedItems(feedUrl, [
        anItem({ link: "THE_LINK" }),
        anItem({ link: "THE_LINK" }),
        anItem({ link: "OTHER" }),
      ]);

      const updates = await fetchRecentUpdates(
        {
          feedUrl,
          serviceName,
          serviceKey,
        },
        wideTimeWindow
      );

      const references = updates.map((u) => u.incidentReference);
      expect(references[0]).to.equal(references[1]);
      expect(references[0]).not.to.equal(references[2]);
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
        },
      ];

      const ingestions = buildIngestions(services);

      expect(ingestions).to.have.lengthOf(1);
      const ingestion = ingestions[0];
      expect(ingestion.name).to.equal("service_key@paypal");
      expect(ingestion.providerName).to.equal("paypal");
      expect(ingestion.data.feedUrl).to.equal(
        "https://www.paypal-status.com/feed/rss"
      );
      expect(ingestion.data.serviceName).to.equal("SERVICE_NAME");
      expect(ingestion.data.serviceKey).to.equal("service_key");
    });
  });
});
