'use strict';

const core = require('./core');
const pattern = require('./pattern');
const settings = require('./settings');
const sitemapEntityContentTypeLinks = require('./sitemapEntityContentTypeLinks');

module.exports = {
  core,
  pattern,
  settings,
  'sitemap-entity-content-type-link': sitemapEntityContentTypeLinks,
};
