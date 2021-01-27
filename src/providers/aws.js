const Feed = require("../infra/feed");
const cheerio = require("cheerio");

const TITLE_KEYWORDS = ["[RESOLVED]"];
const PROVIDER_NAME = "aws";

const buildIngestions = (services) => {
  return services.map((service) => ({
    name: `${service.key}@${PROVIDER_NAME}`,
    providerName: PROVIDER_NAME,
    data: {
      feedUrl: service.ingestion.feedUrl,
      serviceName: service.name,
      serviceKey: service.key,
    },
  }));
};

const fetchRecentUpdates = async (
  { feedUrl, serviceName, serviceKey },
  timeWindow
) => {
  const items = await Feed.fetchItems(feedUrl, timeWindow);
  if (!items.length) return [];

  const item = takeLastPublished(items);
  const update = {
    title: item.title,
    description: plainText(item.description),
    link: item.link,
    date: item.pubdate,
    serviceKey: serviceKey,
    serviceName: serviceName,
    status: statusFrom(item.title),
    incidentReference: null,
  };
  return [update];
};

const takeLastPublished = (items) => {
  return items.sort((a, b) => new Date(b.pubdate) - new Date(a.pubdate))[0];
};

const plainText = (description) => cheerio.load(description).text();

const statusFrom = (title) => {
  const keywordMatch = TITLE_KEYWORDS.some((k) => title.includes(k));
  return keywordMatch ? "resolved" : "active";
};

module.exports = { buildIngestions, fetchRecentUpdates };
