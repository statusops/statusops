let stubbedNow;

const now = () => stubbedNow || new Date();

const windowFromNowMins = (minutes) => {
  const end = now();
  const start = new Date(end);
  start.setMinutes(end.getMinutes() - minutes);
  return { start, end };
};

const stubNow = (date) => {
  stubbedNow = date;
};
const restoreNow = () => {
  stubbedNow = undefined;
};

module.exports = { now, stubNow, restoreNow, windowFromNowMins };
