const logger = require("../infra/logger");
const axios = require("axios");

const apiUrl = "https://status.slack.com/api/v2.0.0/history";

const buildIngestions = (services) => {
  const service = services[0];
  const ingestion = {
    name: "slack@slack",
    providerName: "slack",
    data: { apiUrl, serviceName: service.name, serviceKey: service.key },
  };
  return [ingestion];
};

const fetchRecentUpdates = async (
  { apiUrl, serviceKey, serviceName },
  timeWindow
) => {
  const incidents = await readIncidents(apiUrl);

  const updates = incidents
    .map((incident) => {
      const lastNote = incident.notes.sort(
        (a, b) =>
          new Date(b.date_created).getTime() -
          new Date(a.date_created).getTime()
      )[0];
      const statusFrom = (incidentStatus) => {
        const resolvedStatuses = ["ok", "completed", "cancelled"];
        return resolvedStatuses.includes(incidentStatus)
          ? "resolved"
          : "active";
      };

      return {
        title: incident.title,
        description: lastNote.body,
        date: new Date(lastNote.date_created),
        serviceName,
        serviceKey,
        status: statusFrom(incident.status),
        link: incident.url,
        incidentReference: incident.id,
        components: incident.services.join(", "),
      };
    })
    .filter(
      (update) =>
        !!update &&
        update.date >= timeWindow.start &&
        update.date <= timeWindow.end
    );
  logger.debug(
    `Filtered recent updates (${updates.length}/${incidents.length} from ${apiUrl}`
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
module.exports = { buildIngestions, fetchRecentUpdates };
