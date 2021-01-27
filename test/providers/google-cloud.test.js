const sinon = require("sinon");
const { expect } = require("chai");
const axios = require("axios");
const logger = require("../../src/infra/logger");
const {
  buildIngestions,
  fetchRecentUpdates,
} = require("../../src/providers/google-cloud");

describe("Google cloud", () => {
  beforeEach(() => {
    logger.mute();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("buildIngestions", () => {
    it("groups ingestions from same base url", () => {
      const services = [
        {
          name: "SERVICE_1",
          key: "service_1",
          ingestion: {
            baseUrl: "BASE_A",
            serviceKey: "service-1",
          },
        },
        {
          name: "SERVICE_2",
          key: "service_2",
          ingestion: {
            baseUrl: "BASE_A",
            serviceKey: "service-2",
          },
        },
        {
          name: "SERVICE_3",
          key: "service_3",
          ingestion: {
            baseUrl: "BASE_B",
            serviceKey: "service-3",
          },
        },
      ];

      const ingestions = buildIngestions(services);

      expect(ingestions).to.have.lengthOf(2);
      expect(ingestions[0].data).to.deep.equal({
        baseUrl: "BASE_A",
        incidentsUrl: "BASE_A/incidents.json",
        services: [
          { name: "SERVICE_1", key: "service_1", ingestionKey: "service-1" },
          { name: "SERVICE_2", key: "service_2", ingestionKey: "service-2" },
        ],
      });
      expect(ingestions[1].data).to.deep.equal({
        baseUrl: "BASE_B",
        incidentsUrl: "BASE_B/incidents.json",
        services: [
          { name: "SERVICE_3", key: "service_3", ingestionKey: "service-3" },
        ],
      });
      expect(ingestions[0].providerName).to.equal("google-cloud");
      expect(ingestions[1].providerName).to.equal("google-cloud");
      expect(ingestions[0].name).to.equal("BASE_A@google-cloud");
      expect(ingestions[1].name).to.equal("BASE_B@google-cloud");
    });
  });

  describe("fetchRecentUpdates", () => {
    it("provides an update from an incidents endpoint", async () => {
      const uri = "/URI";
      const baseUrl = "BASE_URL";
      const incidentsUrl = "INCIDENTS_URL";
      const serviceKey = "service-key";
      const ingestionKey = "ingestion-key";
      const services = [
        {
          name: "SERVICE_NAME",
          key: serviceKey,
          ingestionKey,
        },
      ];
      const incident = aGoogleCloudIncident({
        end: null,
        external_desc: "THE_TITLE",
        "most-recent-update": {
          text: "THE_DESCRIPTION",
          modified: "2020-07-30T21:19:50Z",
        },
        service_key: ingestionKey,
        uri: uri,
      });
      sinon.stub(axios, "get").resolves({ data: [incident] });

      const updates = await fetchRecentUpdates(
        {
          baseUrl,
          incidentsUrl,
          services,
        },
        wideTimeWindow
      );

      expect(axios.get).to.have.been.calledWith(incidentsUrl);
      expect(updates).to.have.lengthOf(1);
      const update = updates[0];
      expect(update.title).to.equal("THE_TITLE");
      expect(update.description).to.equal("THE_DESCRIPTION");
      expect(update.date.toISOString()).to.equal("2020-07-30T21:19:50.000Z");
      expect(update.link).to.equal("BASE_URL/URI");
      expect(update.serviceName).to.equal("SERVICE_NAME");
      expect(update.serviceKey).to.equal(serviceKey);
    });

    it("can provide multiple updates", async () => {
      const services = [
        { name: "A", key: "a", ingestionKey: "a" },
        { name: "B", key: "b", ingestionKey: "b" },
      ];
      const incidents = [
        aGoogleCloudIncident({ service_key: "a" }),
        aGoogleCloudIncident({ service_key: "b" }),
      ];
      sinon.stub(axios, "get").resolves({ data: incidents });

      const updates = await fetchRecentUpdates(
        {
          baseUrl,
          incidentsUrl,
          services,
        },
        wideTimeWindow
      );

      expect(updates).to.have.lengthOf(2);
    });

    it("ignores services not supported", async () => {
      const services = [
        { name: "SUPPORTED", key: "supported", ingestionKey: "supported" },
      ];
      const incidents = [
        aGoogleCloudIncident({ service_key: "not-supported" }),
        aGoogleCloudIncident({ service_key: "supported" }),
      ];
      sinon.stub(axios, "get").resolves({ data: incidents });

      const updates = await fetchRecentUpdates(
        {
          baseUrl,
          incidentsUrl,
          services,
        },
        wideTimeWindow
      );

      expect(updates).to.have.lengthOf(1);
    });

    it("assigns resolved status when not null end", async () => {
      const incidents = [
        aGoogleCloudIncident({ end: null }),
        aGoogleCloudIncident({ end: "2020-07-30T21:21:50Z" }),
      ];
      sinon.stub(axios, "get").resolves({ data: incidents });

      const updates = await fetchRecentUpdates(
        {
          baseUrl,
          incidentsUrl,
          services: defaultServices,
        },
        wideTimeWindow
      );

      expect(updates[0].status).to.equal("active");
      expect(updates[1].status).to.equal("resolved");
    });

    it("assigns resolved status when description contains a keyword", async () => {
      const incidents = [
        aGoogleCloudIncident({
          end: null,
          external_desc: "has been resolved for all",
        }),
      ];
      sinon.stub(axios, "get").resolves({ data: incidents });

      const updates = await fetchRecentUpdates(
        {
          baseUrl,
          incidentsUrl,
          services: defaultServices,
        },
        wideTimeWindow
      );

      expect(updates[0].status).to.equal("resolved");
    });

    it("discards updates from outside the time window", async () => {
      const timeWindow = {
        start: new Date("2020-07-30T21:20:00Z"),
        end: new Date("2020-07-30T21:25:00Z"),
      };
      const incidents = [
        aGoogleCloudIncident({
          "most-recent-update": { modified: "2020-07-30T21:19:59Z" },
        }),
        aGoogleCloudIncident({
          "most-recent-update": { modified: "2020-07-30T21:20:00Z" },
        }),
        aGoogleCloudIncident({
          "most-recent-update": { modified: "2020-07-30T21:25:00Z" },
        }),
        aGoogleCloudIncident({
          "most-recent-update": { modified: "2020-07-30T21:25:01Z" },
        }),
      ];
      sinon.stub(axios, "get").resolves({ data: incidents });
      const updates = await fetchRecentUpdates(
        {
          baseUrl,
          incidentsUrl,
          services: defaultServices,
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
          baseUrl,
          incidentsUrl,
          services: defaultServices,
        },
        wideTimeWindow
      );

      expect(updates).to.be.empty;
    });

    it("uses incident uri as reference", async () => {
      const incidents = [
        aGoogleCloudIncident({
          uri: "THE_URI",
        }),
        aGoogleCloudIncident({
          uri: "THE_URI",
        }),
        aGoogleCloudIncident({
          uri: "OTHER",
        }),
      ];
      sinon.stub(axios, "get").resolves({ data: incidents });

      const updates = await fetchRecentUpdates(
        {
          baseUrl,
          incidentsUrl,
          services: defaultServices,
        },
        wideTimeWindow
      );

      const references = updates.map((u) => u.incidentReference);
      expect(references[0]).to.equal(references[1]);
      expect(references[0]).not.to.equal(references[2]);
    });

    const baseUrl = "BASE_URL";
    const incidentsUrl = "INCIDENTS_URL";

    const defaultServices = [
      {
        name: "SERVICE",
        ingestionKey: "ingestion-service-key",
        key: "service-key",
      },
    ];

    const aGoogleCloudIncident = (attributes = {}) => {
      const defaults = {
        end: null,
        external_desc: "THE_TITLE",
        "most-recent-update": {
          text: "THE_DESCRIPTION",
          modified: "2020-07-30T21:19:50Z",
        },
        service_key: "ingestion-service-key",
        uri: "URI",
      };
      return { ...defaults, ...attributes };
    };

    const wideTimeWindow = { start: new Date("1900"), end: new Date("2100") };
  });
});
