const STATUSES = ["active", "resolved"];

const checkValidUpdate = (update) => {
  if (!STATUSES.includes(update.status)) {
    return invalid(`Invalid status ${update.status}`);
  }

  const now = new Date();
  if (now < update.date) {
    return invalid(`Future date not supported, ${update.date}`);
  }

  if (!update.serviceKey) {
    return invalid("Missing service key");
  }

  if (!update.serviceName) {
    return invalid("Missing service name");
  }

  if (!update.link) {
    return invalid("Missing link to incident");
  }

  if (!update.title) {
    return invalid("Missing title");
  }

  if (!update.description) {
    return invalid("Missing description");
  }

  if (update.incidentReference === undefined) {
    return invalid("Incident reference is undefined");
  }

  return valid();
};

const invalid = (reason) => ({ isValid: false, error: reason });
const valid = () => ({ isValid: true, error: null });

module.exports = { checkValidUpdate };
