'use strict';

const { Map } = require('immutable');
const { pluginId } = require('../utils');

/**
 * Sitemap.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const DEFAULT = {
  hostname: '',
  limit: 1000,
  xsl: 'xsl/sitemap.xsl',
  includeHomepage: true,
  excludeDrafts: true,
  hostname_overrides: {},
  contentTypes: Map({}),
  customEntries: Map({}),
};

const createDefaultConfig = async () => {
  const pluginStore = strapi.store({
    environment: '',
    type: 'plugin',
    name: pluginId,
  });

  await pluginStore.set({ key: 'settings', DEFAULT });

  return strapi
    .store({
      environment: '',
      type: 'plugin',
      name: pluginId,
    })
    .get({ key: 'settings' });
};

module.exports = () => ({
  getConfig: async () => {
    let config = await strapi
      .store({
        environment: '',
        type: 'plugin',
        name: pluginId,
      })
      .get({ key: 'settings' });

    if (!config) {
      config = await createDefaultConfig();
    }

    return config;
  },
});
