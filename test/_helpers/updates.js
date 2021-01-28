const anUpdate = (attributes = {}) => {
  const defaults = {
    title: "A_TITLE",
    serviceName: "A_SERVICE",
    serviceKey: "A_SERVICE",
    description: "A_DESCRIPTION",
    link: "A_LINK",
    status: "active",
    date: new Date("2020-10-10"),
    incidentReference: "REFERENCE",
  };
  return {
    ...defaults,
    ...attributes,
  };
};

module.exports = { anUpdate };
