const Feed = require("../infra/feed");
const cheerio = require("cheerio");
const RESOLVED_KEYWORDS = ["<strong>Resolved: ", "<strong>Completed: "];
const PROVIDER_NAME = "paypal";
const FEED_URL = "https://www.paypal-status.com/feed/rss";

const buildIngestions = (services) => {
  return services.map((service) => ({
    name: `${service.key}@${PROVIDER_NAME}`,
    providerName: PROVIDER_NAME,
    data: {
      feedUrl: FEED_URL,
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
  const signal = "<br /><strong>";
  const messages = description.split(signal);
  const lastMessage = messages.length > 1 ? signal + messages[1] : description;
  const $ = cheerio.load(lastMessage);
  $("small").remove();
  return $.text();
};

const statusFrom = (description) => {
  const keywordMatch = RESOLVED_KEYWORDS.some((keyword) =>
    description.includes(keyword)
  );
  return keywordMatch ? "resolved" : "active";
};

module.exports = { buildIngestions, fetchRecentUpdates };
