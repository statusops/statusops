const {
  registerProvider,
  reset,
  fetchServices,
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
