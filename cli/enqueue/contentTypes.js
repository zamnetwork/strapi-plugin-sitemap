const { pluginId, getConfigContentTypes, collectionNameToContentType } = require('../../server/utils');

async function contentTypes() {
  const { xsl, types, all, limit } = this.opts();
  if (!all && !types) this.parent.error('Either use --all flag or pass a content types using --types');
  let entityTypes = {};
  if (all) entityTypes = await getConfigContentTypes();
  else {
    for (let x = 0; x < types.length; x += 1) {
      const key = types[x];
      const contentType = await collectionNameToContentType(key);
      entityTypes = {
        ...contentType,
        ...entityTypes,
      };
    }
  }
  await strapi.plugin(pluginId).service('sitemap').enqueueContentTypes(xsl, entityTypes, limit);
}

module.exports = contentTypes;
