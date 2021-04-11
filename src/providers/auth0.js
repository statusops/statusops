const Feed = require("../infra/feed");
const cheerio = require("cheerio");
const RESOLVED_KEYWORDS = [
  "<strong>Resolved</strong>",
  "<strong>Completed</strong>",
];
const PROVIDER_NAME = "auth0";
const FEED_BASE_URL = "https://status.auth0.com/feed?domain=";

const buildIngestions = (services) => {
  return services.map((service) => ({
    name: `${service.key}@${PROVIDER_NAME}`,
    providerName: PROVIDER_NAME,
    data: {
      feedUrl: FEED_BASE_URL + service.ingestion.domain,
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

  const updates = items.map((item) => ({
    title: item.title,
    description: latestUpdate(item.description),
    link: item.link,
    date: item.pubdate,
    serviceKey: serviceKey,
    serviceName: serviceName,
    status: statusFrom(item.description),
    incidentReference: item.link,
  }));

  return updates;
};

const latestUpdate = (description) => {
  const $ = cheerio.load(description);
  $("small").remove();
  return $("p").first().text();
};

const statusFrom = (description) => {
  const keywordMatch = RESOLVED_KEYWORDS.some((keyword) =>
    description.includes(keyword)
  );
  return keywordMatch ? "resolved" : "active";
};

module.exports = {
  fetchRecentUpdates,
  buildIngestions,
};
