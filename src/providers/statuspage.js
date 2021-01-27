const axios = require("axios");
const Feed = require("../infra/feed");
const logger = require("../infra/logger");
const cheerio = require("cheerio");
const RESOLVED_KEYWORDS = [
  "<strong>Resolved</strong>",
  "<strong>Completed</strong>",
];
const PROVIDER_NAME = "statuspage";

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

const fetchComponents = async (incidentUrl) => {
  const parseComponents = (element) => {
    const DETAILS_PATTERN = /This.*?:\s/gi;
    const section = element.text().trim();

    if (section === "") return;

    return section.replace(DETAILS_PATTERN, "").trim();
  };
  try {
    logger.debug(`Fetching components for ${incidentUrl}`);
    const response = await axios.get(incidentUrl);
    const $ = cheerio.load(response.data);
    const components = parseComponents($(".components-affected"));
    return components;
  } catch (error) {
    logger.error(`Failed to fetch components from ${incidentUrl}`);
    return undefined;
  }
};

module.exports = { buildIngestions, fetchRecentUpdates };
