'use strict';

const s3 = require('./s3');
const core = require('./core');
const settings = require('./settings');
const pattern = require('./pattern');
const sitemap = require('./sitemap');
const lifecycle = require('./lifecycle');
const sitemapEntityContentTypeLinks = require('./sitemapEntityContentTypeLinks');

module.exports = {
  s3,
  core,
  sitemap,
  settings,
  pattern,
  lifecycle,
  'sitemap-entity-content-type-link': sitemapEntityContentTypeLinks,
};
