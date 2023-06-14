const { pluginId, collectionNameToContentType } = require('../../server/utils');

async function update() {
  const { xsl, type, id, limit } = this.opts();
  let contentType = await collectionNameToContentType(type);
  contentType = Object.keys(contentType)[0];
  await strapi.plugin(pluginId).service('sitemap').enqueueUpdateContentType(id, contentType, xsl, limit);
}

module.exports = update;
