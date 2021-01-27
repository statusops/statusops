const { createLogger, format, transports } = require("winston");

const LOG_LEVEL = process.env.LOG_LEVEL || "info";

let instance = null;

const debug = (message) => {
  getLogger().log("debug", message);
};
const info = (message) => {
  getLogger().log("info", message);
};
const warn = (message) => {
  getLogger().log("warn", message);
};
const error = (message) => {
  getLogger().log("error", message);
};

const getLogger = () => {
  if (instance) return instance;

  instance = createLogger({
    level: LOG_LEVEL,
    format: format.combine(
      format.timestamp(),
      format.printf(
        (trail) => `${trail.timestamp} ${trail.level} ${trail.message}`
      )
    ),
    transports: [new transports.Console()],
  });
  return instance;
};

const mute = () => {
  instance = dummyLog;
};
const unmute = () => {
  instance = null;
};
const dummyLog = { log: () => {} };

module.exports = { info, debug, warn, error, mute, unmute };
