'use strict';

const { Map } = require('immutable');
const { pluginId } = require('../utils');

/**
 * Sitemap.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const createDefaultConfig = async () => {
  const pluginStore = strapi.store({
    environment: '',
    type: 'plugin',
    name: pluginId,
  });

  const value = {
    hostname: '',
    includeHomepage: true,
    excludeDrafts: true,
    hostname_overrides: {},
    contentTypes: Map({}),
    customEntries: Map({}),
  };

  await pluginStore.set({ key: 'settings', value });

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
