'use strict';

const fs = require('fs');
const { logMessage, pluginId } = require('./utils');
const copyPublicFolder = require('./utils/copyPublicFolder');

const { env } = process;

async function createIndices(knex) {
  const query = `CREATE INDEX CONCURRENTLY IF NOT EXISTS sitemaps_entity_id_content_type_idx ON sitemap_entity_content_type_links (entity_id, content_type);`;
  await knex.raw(query);
}

module.exports = async () => {
  const sitemap = strapi.plugin(pluginId);

  try {
    // Load lifecycle methods for auto generation of sitemap.
    await sitemap.service('lifecycle').loadAllLifecycleMethods();

    // Copy the plugins /public folder to the /public/sitemap/ folder in the root of your project.
    if (!fs.existsSync('public/sitemap/xsl/')) {
      if (fs.existsSync('./src/extensions/sitemap/public/')) {
        await copyPublicFolder('./src/extensions/sitemap/public/', 'public/sitemap/');
      } else if (fs.existsSync('./src/plugins/sitemap/public/')) {
        await copyPublicFolder('./src/plugins/sitemap/public/', 'public/sitemap/');
      } else if (fs.existsSync('./node_modules/strapi-plugin-sitemap/public/')) {
        await copyPublicFolder('./node_modules/strapi-plugin-sitemap/public/', 'public/sitemap/');
      }
    }

    // Register permission actions.
    const actions = [
      {
        section: 'plugins',
        displayName: 'Access the plugin settings',
        uid: 'settings.read',
        pluginName: pluginId,
      },
      {
        section: 'plugins',
        displayName: 'Menu link to plugin settings',
        uid: 'menu-link',
        pluginName: pluginId,
      },
    ];
    await strapi.admin.services.permission.actionProvider.registerMany(actions);

  } catch (error) {
    strapi.log.error(logMessage(`Bootstrap failed with error "${error.message}".`));
  }
  const knex = strapi.db.connection;
  if (env.NODE_ENV && env.NODE_ENV.toLowerCase() !== 'test') await createIndices(knex);
};
