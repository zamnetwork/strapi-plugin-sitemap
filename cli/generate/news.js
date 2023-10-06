const { pluginId } = require('../../server/utils');

async function news() {
  const { metric, value } = this.opts();
  await strapi.plugin(pluginId).service('news-sitemap').generate({ metric, value });
}

module.exports = news;
