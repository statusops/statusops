const statuspage = require("./statuspage");
const statusio = require("./statusio");
const googleCloud = require("./google-cloud");
const gsuite = require("./gsuite");
const aws = require("./aws");
const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

let providers = {
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
let services = {
  statuspage: parseServicesYaml(path.join(__dirname, "./statuspage.yml")),
  statusio: parseServicesYaml(path.join(__dirname, "./statusio.yml")),
  "google-cloud": parseServicesYaml(path.join(__dirname, "./google-cloud.yml")),
  gsuite: parseServicesYaml(path.join(__dirname, "./gsuite.yml")),
  aws: parseServicesYaml(path.join(__dirname, "./aws.yml")),
};

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
  if (keys.includes("*")) return allServices;

  return allServices.filter((service) => keys.includes(service.key));
};

const buildIngestions = () => {
  const allIngestions = [];
  for (const name in providers) {
    const provider = providers[name];
    const providerServices = services[name];
    const ingestions = provider.buildIngestions(providerServices);
    allIngestions.push(...ingestions);
  }
  return allIngestions;
};

const getProvider = (name) => {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Provider ${name} is not defined`);
  }

  return provider;
};

module.exports = {
  buildIngestions,
  fetchServices,
  registerProvider,
  getProvider,
  reset,
};
