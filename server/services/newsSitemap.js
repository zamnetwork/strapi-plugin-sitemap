const moment = require('moment');
const constants = require('../utils/constants');
const { pluginId, getService, cleanUrl, buildChunkName } = require('../utils');

async function generate({ metric, value }) {
  const uid = 'api::post.post';
  const { fields, populate } = constants[uid];
  const now = moment();
  const twoDaysAgo = now.subtract(value, metric).toISOString();
  const filters = {
    categories: {
      slug: 'news',
    },
    slug: {
      $notNull: true,
    },
    publishedAt: {
      $gt: twoDaysAgo,
    },
  };
  const posts = await strapi.entityService.findMany(uid, {
    fields,
    filters,
    populate,
  });
  if (posts && posts.length) {
    const config = await getService('settings').getConfig();
    const { pattern } = config.contentTypes[uid]['languages']['und'];
    const { hostname } = config;
    const pluginConf = strapi.config.get('plugin.sitemap');
    const { xsl } = pluginConf;
    const xslKey = strapi.plugin(pluginId).service('s3').buildKey(xsl);
    const xslUrl = strapi.plugin(pluginId).service('s3').getUrl(xslKey);
    const entries = [];
    const { ext } = constants;
    const publication = {
      name: 'Fanbyte',
      language: 'en',
    };
    posts.forEach((post) => {
      const { updatedAt: lastmod, publishedAt, title } = post;
      const publicationDate = moment(publishedAt).format('YYYY-MM-DD');
      const path = strapi.plugins.sitemap.services.pattern.resolvePattern(pattern, post);
      let url = `${hostname}${path}`;
      url = cleanUrl(url);
      entries.push({
        url,
        lastmod,
        news: {
          publication,
          publication_date: publicationDate,
          title,
        },
      });
    });
    const data = await strapi.plugin(pluginId).service('sitemap').entriesToSitemapStream(entries, hostname, xslUrl);
    const chunkName = buildChunkName('news', ext);
    const key = strapi.plugin(pluginId).service('s3').buildKey(chunkName);
    await strapi.plugin(pluginId).service('s3').upload(data, key);
    await strapi.plugin(pluginId).service('sitemap').generateIndex({ xslUrl, hostname });
  }
}

module.exports = () => ({
  generate,
});
