const sinon = require("sinon");
const { expect } = require("chai");
const Feed = require("../../src/infra/feed");
const time = require("../../src/infra/time");
const logger = require("../../src/infra/logger");
const path = require("path");
const axios = require("axios");
const fs = require("fs");

describe("Feed", () => {
  describe("fetchItems", () => {
    beforeEach(() => logger.mute());
    afterEach(() => {
      time.restoreNow();
      sinon.restore();
    });

    it("provides items from feed", async () => {
      const feedUrl = "AN_URL";
      const anyTimeWindow = {
        start: new Date("2000-01-01T00:00:00.000Z"),
        end: new Date("2100-01-01T00:00:00.000Z"),
      };
      const itemA = anItem({
        title: "TITLE_A",
        description: "DESC_A",
        pubdate: new Date("2021-01-16T10:00:00.000Z"),
        link: "LINK_A",
      });
      const itemB = anItem({
        title: "TITLE_B",
        description: "DESC_B",
        pubdate: new Date("2021-01-16T10:01:00.000Z"),
        link: "LINK_B",
      });
      stubFeedItems(feedUrl, [itemA, itemB]);

      const items = await Feed.fetchItems(feedUrl, anyTimeWindow);

      expect(items).to.have.lengthOf(2);
      expect(items[0]).to.equal(itemA);
      expect(items[1]).to.equal(itemB);
    });

    it("ignores items from outside the time window", async () => {
      const feedUrl = "AN_URL";
      const timeWindow = {
        start: new Date("2021-01-16T10:00:00.000Z"),
        end: new Date("2021-01-16T10:05:00.000Z"),
      };
      stubFeedItems(feedUrl, [
        anItem({ pubdate: new Date("2021-01-16T09:59:59.000Z") }),
        anItem({ pubdate: new Date("2021-01-16T10:00:00.000Z") }),
        anItem({ pubdate: new Date("2021-01-16T10:05:00.000Z") }),
        anItem({ pubdate: new Date("2021-01-16T10:05:01.000Z") }),
      ]);

      const items = await Feed.fetchItems(feedUrl, timeWindow);

      const pubdateStrings = items.map((i) => i.pubdate.toISOString());
      expect(pubdateStrings).not.to.contain("2021-01-16T09:59:59.000Z");
      expect(pubdateStrings).to.contain("2021-01-16T10:00:00.000Z");
      expect(pubdateStrings).to.contain("2021-01-16T10:05:00.000Z");
      expect(pubdateStrings).not.to.contain("2021-01-16T10:05:01.000Z");
    });

    it("provides empty list when feed is not available", async () => {
      const anyTimeWindow = {
        start: new Date("2000-01-01T00:00:00.000Z"),
        end: new Date("2100-01-01T00:00:00.000Z"),
      };
      const feedUrl = "AN_URL";
      stubFeedError(feedUrl);

      const items = await Feed.fetchItems(feedUrl, anyTimeWindow);

      expect(items).to.have.lengthOf(0);
    });

    const stubFeedItems = (feedUrl, items) => {
      sinon.stub(Feed, "parse").withArgs(feedUrl).returns(items);
    };

    const stubFeedError = (url) => {
      const stub = sinon.stub(Feed, "parse");
      stub.withArgs(url).rejects();

      return stub;
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
  });

  describe("parse", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("can read an item from an rss feed", async () => {
      const url = "AN_URL";
      const fixtureItem = fixtureRss();
      stubHttpRequestStream(url, fixturePath("fixture.rss"));

      const items = await Feed.parse(url);

      expect(items).to.have.lengthOf(1);
      const item = items[0];
      expect(item.title).to.equal(fixtureItem.title);
      expect(item.description).to.equal(fixtureItem.description);
      expect(item.link).to.equal(fixtureItem.link);
      expect(item.pubdate.toISOString()).to.equal(fixtureItem.pubDateISOString);
    });

    it("can read an item from an atom feed", async () => {
      const url = "AN_URL";
      const fixtureItem = fixtureAtom();
      stubHttpRequestStream(url, fixturePath("fixture.atom"));

      const items = await Feed.parse(url);

      expect(items).to.have.lengthOf(1);
      const item = items[0];
      expect(item.title).to.equal(fixtureItem.title);
      expect(item.description).to.equal(fixtureItem.description);
      expect(item.link).to.equal(fixtureItem.link);
      expect(item.pubdate.toISOString()).to.equal(fixtureItem.pubDateISOString);
    });

    const stubHttpRequestStream = (url, path) => {
      sinon
        .stub(axios, "get")
        .withArgs(url, { responseType: "stream" })
        .resolves({ data: fs.createReadStream(path) });
    };

    const fixtureRss = () => {
      return {
        title: "THE TITLE",
        description: "THE DESCRIPTION",
        link: "http://the_link/",
        pubDateISOString: new Date(
          "Fri, 09 Aug 2019 12:59:48 GMT"
        ).toISOString(),
      };
    };

    const fixtureAtom = () => {
      return {
        title: "THE TITLE",
        description: "THE CONTENT",
        link: "http://the_link/",
        pubDateISOString: new Date("2019-08-16T07:45:52-07:00").toISOString(),
      };
    };

    const fixturePath = (filename) => {
      return path.join(__dirname, filename);
    };
  });
});
