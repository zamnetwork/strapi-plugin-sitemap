const constants = require('../../server/utils/constants');
const { pluginId, getConfigContentTypes, collectionNameToContentType, getConfigCustomEntries } = require('../../server/utils');

async function contentTypes() {
  const { types, all } = this.opts();
  if (!all && !types) this.parent.error('Either use --all flag or pass a content types using --types');
  let entityTypes = {};
  if (all) {
    entityTypes = await getConfigContentTypes();
    const customEntries = await getConfigCustomEntries();
    if (customEntries) {
      entityTypes = {
        ...entityTypes,
        ...customEntries,
      };
    }
  }
  else {
    const { customUrls } = constants;
    for (let x = 0; x < types.length; x += 1) {
      const key = types[x];
      let contentType = null;
      if (key === customUrls) contentType = await getConfigCustomEntries();
      else contentType = await collectionNameToContentType(key);
      entityTypes = {
        ...contentType,
        ...entityTypes,
      };
    }
  }
  await strapi.plugin(pluginId).service('sitemap').generateContentTypes(entityTypes);
}

module.exports = contentTypes;
