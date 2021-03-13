const axios = require("axios");
const logger = require("../../src/infra/logger");
const {
  buildIngestions,
  fetchRecentUpdates,
} = require("../../src/providers/slack");

describe("Slack", () => {
  beforeEach(() => {
    logger.mute();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("buildIngestions", () => {
    it("builds a single ingestion with data to download many services", () => {
      const services = [
        {
          name: "Slack",
          key: "slack",
        },
      ];

      const ingestions = buildIngestions(services);

      expect(ingestions).to.have.lengthOf(1);
      const ingestion = ingestions[0];
      expect(ingestion).to.deep.equal({
        name: "slack@slack",
        providerName: "slack",
        data: {
          apiUrl: "https://status.slack.com/api/v2.0.0/history",
          serviceName: "Slack",
          serviceKey: "slack",
        },
      });
    });
  });

  describe("fetchRecentUpdates", () => {
    const apiUrl = "API_URL";
    const serviceName = "Slack";
    const serviceKey = "slack";

    it("provides an update from an /history endpoint", async () => {
      const incident = aSlackIncident({
        id: "INCIDENT_ID",
        date_updated: "2020-07-30T22:19:50Z",
        title: "TITLE",
        status: "ok",
        url: "INCIDENT_URL",
        services: ["COMPONENT_A", "COMPONENT_B"],
        notes: [{ date_created: "2020-07-30T22:19:50Z", body: "DESCRIPTION" }],
      });
      sinon.stub(axios, "get").resolves({ data: [incident] });

      const updates = await fetchRecentUpdates(
        {
          apiUrl,
          serviceName,
          serviceKey,
        },
        wideTimeWindow
      );

      expect(axios.get).to.have.been.calledWith(apiUrl);
      expect(updates).to.have.lengthOf(1);
      const update = updates[0];
      expect(update.title).to.equal("TITLE");
      expect(update.description).to.equal("DESCRIPTION");
      expect(update.date.toISOString()).to.equal("2020-07-30T22:19:50.000Z");
      expect(update.link).to.equal("INCIDENT_URL");
      expect(update.serviceName).to.equal("Slack");
      expect(update.serviceKey).to.equal("slack");
      expect(update.components).to.equal("COMPONENT_A, COMPONENT_B");
      expect(update.incidentReference).to.equal("INCIDENT_ID");
    });

    it("can provide multiple updates for the same service", async () => {
      const incidents = [
        aSlackIncident({ title: "TITLE_A" }),
        aSlackIncident({ title: "TITLE_B" }),
      ];
      sinon.stub(axios, "get").resolves({ data: incidents });

      const updates = await fetchRecentUpdates(
        {
          apiUrl,
          serviceName,
          serviceKey,
        },
        wideTimeWindow
      );

      expect(updates).to.have.lengthOf(2);
      expect(updates[0].title).to.equal("TITLE_A");
      expect(updates[1].title).to.equal("TITLE_B");
    });

    it("detects status of incidents", async () => {
      const incidents = [
        aSlackIncident({ status: "ok" }),
        aSlackIncident({ status: "active" }),
        aSlackIncident({ status: "scheduled" }),
        aSlackIncident({ status: "completed" }),
        aSlackIncident({ status: "cancelled" }),
      ];
      sinon.stub(axios, "get").resolves({ data: incidents });

      const updates = await fetchRecentUpdates(
        {
          apiUrl,
          serviceName,
          serviceKey,
        },
        wideTimeWindow
      );

      expect(updates[0].status).to.equal("resolved");
      expect(updates[1].status).to.equal("active");
      expect(updates[2].status).to.equal("active");
      expect(updates[3].status).to.equal("resolved");
      expect(updates[4].status).to.equal("resolved");
    });

    it("only considers last note from incident", async () => {
      const incidents = [
        aSlackIncident({
          notes: [
            { date_created: "2020-07-30T21:19:00Z" },
            { date_created: "2020-07-30T21:20:00Z" },
            { date_created: "2020-07-30T21:25:00Z" },
            { date_created: "2020-07-30T21:18:00Z" },
          ],
        }),
      ];
      sinon.stub(axios, "get").resolves({ data: incidents });
      const updates = await fetchRecentUpdates(
        {
          apiUrl,
          serviceKey,
          serviceName,
        },
        wideTimeWindow
      );

      expect(updates).to.have.lengthOf(1);
      const dates = updates.map((u) => u.date);
      expect(dates[0].toISOString()).to.equal("2020-07-30T21:25:00.000Z");
    });

    it("discards updates from outside the time window", async () => {
      const timeWindow = {
        start: new Date("2020-07-30T21:20:00Z"),
        end: new Date("2020-07-30T21:25:00Z"),
      };
      const incidents = [
        aSlackIncident({
          notes: [{ date_created: "2020-07-30T21:19:59Z" }],
        }),
        aSlackIncident({
          notes: [{ date_created: "2020-07-30T21:20:00Z" }],
        }),
        aSlackIncident({
          notes: [{ date_created: "2020-07-30T21:25:00Z" }],
        }),
        aSlackIncident({
          notes: [{ date_created: "2020-07-30T21:25:01Z" }],
        }),
      ];
      sinon.stub(axios, "get").resolves({ data: incidents });
      const updates = await fetchRecentUpdates(
        {
          apiUrl,
          serviceKey,
          serviceName,
        },
        timeWindow
      );

      expect(updates).to.have.lengthOf(2);
      const dates = updates.map((u) => u.date);
      expect(dates[0].toISOString()).to.equal("2020-07-30T21:20:00.000Z");
      expect(dates[1].toISOString()).to.equal("2020-07-30T21:25:00.000Z");
    });

    it("provides an empty list when endpoint not available", async () => {
      sinon.stub(axios, "get").rejects();

      const updates = await fetchRecentUpdates(
        {
          apiUrl,
          serviceKey,
          serviceName,
        },
        wideTimeWindow
      );

      expect(updates).to.be.empty;
    });

    const aSlackIncident = (attributes = {}) => {
      const defaults = {
        id: "AN_ID",
        date_updated: "2010-07-30T22:19:50Z",
        title: "A_TITLE",
        status: "ok",
        url: "AN_URL",
        services: ["A_SERVICE"],
        notes: [
          { date_created: "2010-07-30T22:19:50Z", body: "A_DESCRIPTION" },
        ],
      };
      return { ...defaults, ...attributes };
    };

    const wideTimeWindow = { start: new Date("1900"), end: new Date("2100") };
  });
});
