const Feed = require("../../src/infra/feed");
const logger = require("../../src/infra/logger");
const {
  buildIngestions,
  fetchRecentUpdates,
} = require("../../src/providers/auth0");

describe("Auth0", () => {
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

    it("parses the last update of a statuspage incident", async () => {
      let description = "";
      description +=
        "<p><small>Oct <var data-var='date'>25</var>, <var data-var='time'>09:37</var> PDT</small><br><strong>Update</strong> - LAST UPDATE.</p>";
      description +=
        "<p><small>Oct <var data-var='date'>25</var>, <var data-var='time'>09:37</var> PDT</small><br><strong>Update</strong> - PREVIOUS UPDATE.</p>";
      description +=
        "<p><small>Oct <var data-var='date'>25</var>, <var data-var='time'>09:37</var> PDT</small><br><strong>Update</strong> - EVEN MORE PREVIOUS UPDATE.</p>";

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

      expect(updates[0].description).to.equal("Update - LAST UPDATE.");
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
          "<p><small></small><strong>Resolved</strong> - Description</p>",
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
          ingestion: {
            domain: "AUTH0_DOMAIN",
          },
        },
      ];

      const ingestions = buildIngestions(services);

      expect(ingestions).to.have.lengthOf(1);
      const ingestion = ingestions[0];
      expect(ingestion.name).to.equal("service_key@auth0");
      expect(ingestion.providerName).to.equal("auth0");
      expect(ingestion.data.feedUrl).to.contain(
        "https://status.auth0.com/feed?domain=AUTH0_DOMAIN"
      );
      expect(ingestion.data.serviceName).to.equal("SERVICE_NAME");
      expect(ingestion.data.serviceKey).to.equal("service_key");
    });
  });
});
