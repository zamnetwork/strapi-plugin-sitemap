const { pluginId, collectionNameToContentType } = require('../../server/utils');

async function update() {
  const { type, id } = this.opts();
  let contentType = await collectionNameToContentType(type);
  contentType = Object.keys(contentType)[0];
  await strapi.plugin(pluginId).service('sitemap').enqueueUpdateContentType(id, contentType);
}

module.exports = update;
