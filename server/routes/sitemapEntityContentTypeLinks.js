const get = require('lodash.get');
const sitemapEntityContentTypeLinks = require('../content-types');

const uid = 'sitemap-entity-content-type-link';
const pluralName = get(sitemapEntityContentTypeLinks, `${uid}.schema.info.pluralName`);

module.exports = [
  {
    method: 'GET',
    path: `/${pluralName}`,
    handler: `${uid}.find`,
    config: {},
  },
  {
    method: 'GET',
    path: `/${pluralName}/:id`,
    handler: `${uid}.findOne`,
    config: {},
  },
  {
    method: 'POST',
    path: `/${pluralName}`,
    handler: `${uid}.create`,
    config: {},
  },
  {
    method: 'PUT',
    path: `/${pluralName}/:id`,
    handler: `${uid}.update`,
    config: {},
  },
  {
    method: 'DELETE',
    path: `/${pluralName}/:id`,
    handler: `${uid}.delete`,
    config: {},
  },
];


