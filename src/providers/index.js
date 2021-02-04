const statuspage = require("./statuspage");
const statusio = require("./statusio");
const googleCloud = require("./google-cloud");
const gsuite = require("./gsuite");
const aws = require("./aws");
const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

let providers = {};
let services = {};
const registerProvider = (name, provider, providerServices) => {
  providers[name] = provider;
  services[name] = providerServices;
};

const reset = () => {
  providers = {};
  services = {};
};

const fetchServices = (keys = []) => {
  const allServices = [];
  for (const providerName in services) {
    for (const service of services[providerName]) {
      allServices.push({ ...service, providerName });
    }
  }
  return filterServices(allServices, keys);
};

const buildIngestions = (serviceKeys) => {
  const allIngestions = [];
  for (const name in providers) {
    const provider = providers[name];
    const providerServices = services[name];
    const filteredServices = filterServices(providerServices, serviceKeys);
    if (!filteredServices.length) continue;

    const ingestions = provider.buildIngestions(filteredServices);
    allIngestions.push(...ingestions);
  }
  return allIngestions;
};

const filterServices = (services, serviceKeys) => {
  if (serviceKeys.includes("*")) return services;

  return services.filter((s) => serviceKeys.includes(s.key));
};

const getProvider = (name) => {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Provider ${name} is not defined`);
  }

  return provider;
};

const loadFromConfig = () => {
  providers = {
    statuspage,
    statusio,
    "google-cloud": googleCloud,
    gsuite,
    aws,
  };
  const parseServicesYaml = (path) => {
    const content = yaml.load(fs.readFileSync(path));
    const services = [];
    for (const serviceKey in content) {
      services.push({ key: serviceKey, ...content[serviceKey] });
    }
    return services;
  };
  services = {
    statuspage: parseServicesYaml(path.join(__dirname, "./statuspage.yml")),
    statusio: parseServicesYaml(path.join(__dirname, "./statusio.yml")),
    "google-cloud": parseServicesYaml(
      path.join(__dirname, "./google-cloud.yml")
    ),
    gsuite: parseServicesYaml(path.join(__dirname, "./gsuite.yml")),
    aws: parseServicesYaml(path.join(__dirname, "./aws.yml")),
  };
};

module.exports = {
  buildIngestions,
  fetchServices,
  registerProvider,
  getProvider,
  reset,
  loadFromConfig,
};
