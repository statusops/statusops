const Sentry = require("@sentry/node");
const dsn = process.env.SENTRY_DSN;
Sentry.init({
  dsn,
  maxBreadcrumbs: 20,
});

const captureException = (error) => {
  Sentry.captureException(error);
};

module.exports = { captureException };
