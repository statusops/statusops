const Feed = require("../infra/feed");
const cheerio = require("cheerio");
const logger = require("../infra/logger");
const axios = require("axios");

const PROVIDER_NAME = "statusio";
const RESOLVED_KEYWORDS = [
  "<strong>Resolved</strong>",
  "<strong>Completed</strong>",
];

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
  for (const update of updates) {
    update.components = await fetchComponents(update.link);
  }
  return updates;
};

const latestUpdate = (description) => {
  const messages = description.split("<br /><br />");
  const lastMessage = messages[messages.length - 2];
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

const fetchComponents = async (incidentUrl) => {
  const parseComponents = (element) => {
    const section = element.text().trim();

    if (section === "") return;

    return section;
  };
  try {
    logger.debug(`Fetching components for ${incidentUrl}`);
    const response = await axios.get(incidentUrl);
    const $ = cheerio.load(response.data);
    const components = parseComponents(
      $(
        '.panel-body .row:has(.event_inner_title:contains("Components")) .event_inner_text'
      )
    );
    return components;
  } catch (error) {
    logger.error(`Failed to fetch components from ${incidentUrl}`);
    return undefined;
  }
};
module.exports = { buildIngestions, fetchRecentUpdates };
