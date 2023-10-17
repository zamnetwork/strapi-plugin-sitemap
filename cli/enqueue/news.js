const { pluginId } = require('../../server/utils');

async function news() {
  const { metric, value } = this.opts();
  const data = [{
    metric,
    value,
  }];
  const service = 'news-sitemap';
  const func = 'generate';
  const queue = 'sitemap';
  await strapi.plugin('sqs').service('sqs').enqueue(data, pluginId, service, func, queue);
}

module.exports = news;
