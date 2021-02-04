const {
  registerProvider,
  reset,
  fetchServices,
  buildIngestions,
  loadFromConfig,
} = require("../../src/providers");

describe("fetch services", () => {
  beforeEach(() => {
    reset();
  });

  it("allows to filter services by a list of keys", () => {
    const serviceA = { key: "service-a", name: "SERVICE_A" };
    const serviceB = { key: "service-b", name: "SERVICE_B" };
    const nullImplementation = {};
    registerProvider("PROVIDER_A", nullImplementation, [serviceA]);
    registerProvider("PROVIDER_B", nullImplementation, [serviceB]);

    const services = fetchServices(["service-a"]);

    expect(services).to.have.lengthOf(1);
    expect(services[0].key).to.equal("service-a");
    expect(services[0].name).to.equal("SERVICE_A");
    expect(services[0].providerName).to.equal("PROVIDER_A");
  });

  it("provides by default no services by default", () => {
    const serviceA = { key: "service-a", name: "SERVICE_A" };
    const nullImplementation = {};
    registerProvider("PROVIDER_A", nullImplementation, [serviceA]);

    const services = fetchServices();

    expect(services).to.have.lengthOf(0);
  });

  it("considers * as all services", () => {
    const serviceA = { key: "service-a", name: "SERVICE_A" };
    const serviceB = { key: "service-b", name: "SERVICE_B" };
    const nullImplementation = {};
    registerProvider("PROVIDER_A", nullImplementation, [serviceA]);
    registerProvider("PROVIDER_B", nullImplementation, [serviceB]);

    const services = fetchServices(["*"]);

    expect(services).to.have.lengthOf(2);
  });
});

describe("buildIngestions", () => {
  it("provides ingestions for all services", () => {
    loadFromConfig();

    const result = buildIngestions(["*"]);

    expect(includedInName(result, "gitlab")).to.equal(true);
    expect(includedInName(result, "github")).to.equal(true);
    expect(includedInName(result, "cloudflare")).to.equal(true);
  });

  it("allows to filter services by keys", () => {
    loadFromConfig();

    const result = buildIngestions(["github", "gitlab"]);

    expect(includedInName(result, "gitlab")).to.equal(true);
    expect(includedInName(result, "github")).to.equal(true);
    expect(includedInName(result, "cloudflare")).to.equal(false);
  });

  it("does not include include providers without services", () => {
    loadFromConfig();

    const result = buildIngestions(["github", "gitlab"]);

    expect(includedInName(result, "gsuite")).to.equal(false);
  });

  it("ignores services that not exist", () => {
    loadFromConfig();

    const result = buildIngestions(["NON_EXISTING", "github"]);

    expect(includedInName(result, "NON_EXISTING")).to.equal(false);
    expect(includedInName(result, "github")).to.equal(true);
  });

  const includedInName = (ingestions, text) => {
    return ingestions.some((i) => i.name.includes(text));
  };
});
