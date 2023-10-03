const { factories } = require('@strapi/strapi');

module.exports = factories.createCoreController(
  'plugin::sitemap.sitemap-entity-content-type-link',
);
