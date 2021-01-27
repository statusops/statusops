const axios = require("axios");
const logger = require("../infra/logger");

const PROVIDER_NAME = "google-cloud";
const RESOLVED_KEYWORDS = [
  "We thank you for your patience while we worked on resolving the issue.",
  "We thank you for your patience while we're working on resolving the issue.",
  "has been resolved for all",
];

const buildIngestions = (services) => {
  const servicesByBaseUrl = services.reduce((acc, service) => {
    const baseUrl = service.ingestion.baseUrl;
    if (!acc[baseUrl]) {
      acc[baseUrl] = [];
    }

    acc[baseUrl].push(service);
    return acc;
  }, {});
  const ingestions = [];
  for (const baseUrl in servicesByBaseUrl) {
    ingestions.push({
      providerName: PROVIDER_NAME,
      name: `${baseUrl}@${PROVIDER_NAME}`,
      data: {
        baseUrl,
        incidentsUrl: baseUrl + "/incidents.json",
        services: servicesByBaseUrl[baseUrl].map((s) => ({
          key: s.key,
          name: s.name,
          ingestionKey: s.ingestion.serviceKey,
        })),
      },
    });
  }
  return ingestions;
};

const fetchRecentUpdates = async (
  { baseUrl, incidentsUrl, services },
  timeWindow
) => {
  const incidents = await readIncidents(incidentsUrl);
  logger.debug(`Collected ${incidents.length} incidents from ${incidentsUrl}`);
  const updates = incidents
    .map((incident) => {
      const service = services.find(
        (s) => s.ingestionKey === incident.service_key
      );
      if (!service) {
        logger.warn(`Removing service not registered ${incident.service_key}`);
        return null;
      }

      const statusFrom = (end, description) => {
        const keywordMatch = RESOLVED_KEYWORDS.some((keyword) =>
          description.includes(keyword)
        );
        return end || keywordMatch ? "resolved" : "active";
      };

      return {
        title: incident.external_desc,
        description: incident["most-recent-update"].text,
        date: new Date(incident["most-recent-update"].modified),
        serviceName: service.name,
        serviceKey: service.key,
        status: statusFrom(incident.end, incident.external_desc),
        link: baseUrl + incident.uri,
        incidentReference: incident.uri,
      };
    })
    .filter(
      (update) =>
        !!update &&
        update.date >= timeWindow.start &&
        update.date <= timeWindow.end
    );
  logger.debug(
    `Filtered recent updates (${updates.length}/${incidents.length} from ${incidentsUrl}`
  );
  return updates;
};

const readIncidents = async (incidentsUrl) => {
  try {
    const response = await axios.get(incidentsUrl);
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch from ${incidentsUrl}`);
    return [];
  }
};
module.exports = { fetchRecentUpdates, buildIngestions };
