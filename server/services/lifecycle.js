'use strict';

const { getService, logMessage } = require('../utils');

/**
 * Gets lifecycle service
 *
 * @returns {object} - Lifecycle service
 */

const subscribeLifecycleMethods = async (modelName) => {
  const sitemapService = await getService('sitemap');

  if (strapi.contentTypes[modelName]) {
    await strapi.db.lifecycles.subscribe({
      models: [modelName],

      async afterUpdate(event) {
        const {
          result: {
            id,
            sitemap_exclude: sitemapExclude,
            publishedAt,
          },
          model: {
            uid: contentType,
          },
        } = event;
        if (!sitemapExclude && publishedAt) {
          strapi.log.info('Enqueuing sitemap update due to lifecycle hook trigger');
          await sitemapService.enqueueUpdateContentType(id, contentType);
        }
      },

      // async afterDelete(event) {
      //   await sitemapService.createSitemap();
      // },

      // async afterDeleteMany(event) {
      //   await sitemapService.createSitemap();
      // },
    });
  } else {
    strapi.log.error(logMessage(`Could not load lifecycles on model '${modelName}'`));
  }
};

module.exports = () => ({
  async loadAllLifecycleMethods() {
    const settings = await getService('settings').getConfig();
    const pluginConf = strapi.config.get('plugin.sitemap'); // this is read from plugins.ts
    const serverConf = strapi.config.get('server');
    const { isListener } = serverConf;
    const { autoGenerate, autoGenerateMap = {} } = pluginConf;
    // Loop over configured contentTypes from store.
    if (settings.contentTypes && autoGenerate && !isListener) {
      Object.keys(settings.contentTypes).map(async (contentType) => {
        if (autoGenerateMap[contentType]) await subscribeLifecycleMethods(contentType);
      });
    }
  },

  async loadLifecycleMethod(modelName) {
    const pluginConf = strapi.config.get('plugin.sitemap'); // this is read from plugins.ts
    const serverConf = strapi.config.get('server');
    const { isListener } = serverConf;
    const { autoGenerate, autoGenerateMap = {} } = pluginConf;
    if (autoGenerate && !isListener && autoGenerateMap[modelName]) {
      await subscribeLifecycleMethods(modelName);
    }
  },
});
