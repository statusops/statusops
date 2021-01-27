const Feed = require("../infra/feed");
const logger = require("../infra/logger");
const cheerio = require("cheerio");
const RESOLVED_KEYWORDS = ["img/blue.gif"];
const FEED_URL = "https://www.google.com/appsstatus/rss/en";

const buildIngestions = (services) => {
  return [
    {
      name: "gsuite",
      providerName: "gsuite",
      data: {
        feedUrl: FEED_URL,
        services,
      },
    },
  ];
};

const fetchRecentUpdates = async ({ feedUrl, services }, timeWindow) => {
  const items = await Feed.fetchItems(feedUrl, timeWindow);
  return items
    .filter((item) => {
      if (!services.some((s) => s.name === item.title)) {
        logger.warn(`Service ${item.title} not supported`);
        return false;
      }
      return true;
    })
    .map((item) => ({
      title: item.title,
      description: latestUpdate(item.description),
      date: item.pubdate,
      link: item.link,
      serviceName: item.title,
      serviceKey: services.find((s) => s.name === item.title).key,
      status: hasResolvedKeyword(item.description) ? "resolved" : "active",
      incidentReference: null,
    }));
};

const latestUpdate = (description) => {
  const $ = cheerio.load(description);
  return $("p").first().text();
};

const hasResolvedKeyword = (description) => {
  return RESOLVED_KEYWORDS.some((k) => description.includes(k));
};

module.exports = { fetchRecentUpdates, buildIngestions };
