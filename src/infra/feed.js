const logger = require("./logger");
const axios = require("axios");
const FeedParser = require("feedparser");

class Feed {
  static async parse(url) {
    logger.debug(`Fetching feed items from ${url}`);
    const response = await axios.get(url, { responseType: "stream" });
    const feedStream = response.data;

    return new Promise((resolve, reject) => {
      const items = [];
      feedStream
        .pipe(FeedParser())
        .on("readable", function () {
          let item = this.read();
          while (item) {
            items.push(item);
            item = this.read();
          }
        })
        .on("end", function () {
          logger.debug(`Collected items from ${url} (${items.length})`);
          resolve(items);
        })
        .on("error", function (error) {
          reject(error);
        });
    });
  }

  static async fetchItems(feedUrl, timeWindow) {
    try {
      const items = await this.parse(feedUrl);
      const filtered = items.filter((i) => {
        return i.pubdate >= timeWindow.start && i.pubdate <= timeWindow.end;
      });
      logger.debug(`Filtered recent items for ${feedUrl} (${filtered.length})`);
      return filtered;
    } catch (error) {
      captureError(feedUrl, error);
      return [];
    }
  }
}

const captureError = (url, error) => {
  const message = `Error reading from feed ${url}: ${error}.`;
  logger.warn(message);
};

module.exports = Feed;
