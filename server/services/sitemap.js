'use strict';

const { createReadStream } = require('fs');
const { chunk } = require('lodash');
const { SitemapIndexStream, SitemapStream, parseSitemap, streamToPromise } = require('sitemap');
const { pluginId, getService, buildChunkName, delay, cleanUrl } = require('../utils');
const constants = require('../utils/constants');

async function generateIndex({ xslUrl, hostname }) {
  const { sitemapIndex } = constants;
  const s3Content = await getContentTypesInS3();
  const sis = new SitemapIndexStream({
    hostname,
    xslUrl,
  });
  const files = Object.keys(s3Content);
  const sitemaps = [];
  for (let x = 0; x < files.length; x += 1) {
    const name = files[x];
    if (name === sitemapIndex) continue;
    const lastmod = s3Content[name];
    const key = strapi.plugin(pluginId).service('s3').buildKey(name);
    const url = strapi.plugin(pluginId).service('s3').getUrl(key);
    sitemaps.push({
      url,
      lastmod,
    });
  }
  sitemaps.map((entry) => sis.write(entry));
  sis.end();
  const data = await streamToPromise(sis);
  const key = strapi.plugin(pluginId).service('s3').buildKey(sitemapIndex);
  const location = await strapi.plugin(pluginId).service('s3').upload(data, key);
  console.log(`Uploaded sitemap index to ${location}`);
}

async function getContentTypesInS3() {
  const content = await strapi.plugin(pluginId).service('s3').listObjects();
  const { Contents } = content;
  const xmls = {};
  if (Contents && Contents.length) {
    const { providerOptions: { params: { Key }} } = strapi.config.get('plugin.upload');
    const splitAt = `${Key}/${pluginId}/`;
    Contents.forEach((Content) => {
      const { Key: key, LastModified: lastModified } = Content;
      const splitz = key.split(splitAt);
      const xml = splitz[splitz.length - 1];
      xmls[xml] = lastModified.toISOString();
    });
  }
  return xmls;
}

async function generateContentType({ xslUrl, hostname, contentType, pattern, counter, filters, limit }) {
  const { collectionName } = strapi.contentTypes[contentType];
  const { fields, populate } = constants[contentType];
  const { ext } = constants;
  const start = counter * limit;
  const sort = {
    id: 'ASC',
  };
  const entities = await strapi.entityService.findMany(contentType, {
    filters,
    fields,
    populate,
    limit,
    start,
    sort,
  });
  const entries = [];
  entities.forEach((entity) => {
    const { updatedAt: lastmod } = entity;
    const path = strapi.plugins.sitemap.services.pattern.resolvePattern(pattern, entity);
    let url = `${hostname}${path}`;
    url = cleanUrl(url);
    entries.push({
      url,
      lastmod,
    });
  });
  const ss = new SitemapStream({
    hostname,
    xslUrl,
  });
  entries.map((entry) => ss.write(entry));
  ss.end();
  const data = await streamToPromise(ss);
  let chunkName = '';
  if (counter) chunkName = buildChunkName(collectionName, ext, counter + 1);
  else chunkName = buildChunkName(collectionName, ext);
  const key = strapi.plugin(pluginId).service('s3').buildKey(chunkName);
  const location = await strapi.plugin(pluginId).service('s3').upload(data, key);
  console.log(`Uploaded sitemap index to ${location}`);
  return chunkName;
}

async function poll(toPoll) {
  console.log('Polling to check if files have been updated in S3');
  let filesToMonitor = Object.keys(toPoll);
  while (filesToMonitor.length) {
    console.log(`Current number of files to monitor: ${filesToMonitor.length}`);
    const s3Content = await getContentTypesInS3();
    const cleanupIndices = [];
    for (let x = 0; x < filesToMonitor.length; x += 1) {
      const key = filesToMonitor[x];
      if (s3Content[key] !== toPoll[key]) cleanupIndices.push(x);
    }
    filesToMonitor = filesToMonitor.filter((value, index) => {
      return cleanupIndices.indexOf(index) === -1;
    });
    await delay(1000);
  }
  return true;
}

async function generateContentTypes(xsl, contentTypes, limit = 1000) {
  const config = await getService('settings').getConfig();
  const { hostname } = config;
  const xslKey = strapi.plugin(pluginId).service('s3').buildKey(xsl);
  const xslUrl = strapi.plugin(pluginId).service('s3').getUrl(xslKey);
  const contentTypeNames = Object.keys(contentTypes);
  const { where: filters } = constants;
  const s3Content = await getContentTypesInS3();
  const toPoll = {};
  for (let x = 0; x < contentTypeNames.length; x += 1) {
    const contentType = contentTypeNames[x];
    const { pattern } = config.contentTypes[contentType]['languages']['und'];
    const count = await strapi.query(contentType).count({ where: filters });
    for (let counter = 0; counter < (count / limit); counter++) {
      const chunkName = await generateContentType({ xslUrl, hostname, contentType, pattern, counter, filters, limit });
      toPoll[chunkName] = s3Content[chunkName] || null;
    }
  }
  const generationComplete = await poll(toPoll);
  if (generationComplete) await generateIndex({ xslUrl, hostname });
}

async function pollAndGenerateIndex(data) {
  const { toPoll, xslUrl, hostname } = data;
  const generationComplete = await poll(toPoll);
  if (generationComplete) await generateIndex({ xslUrl, hostname });
}

async function enqueueContentTypes(xsl, contentTypes, limit = 1000) {
  const config = await getService('settings').getConfig();
  const { hostname } = config;
  const xslKey = strapi.plugin(pluginId).service('s3').buildKey(xsl);
  const xslUrl = strapi.plugin(pluginId).service('s3').getUrl(xslKey);
  const contentTypeNames = Object.keys(contentTypes);
  const { where: filters, ext } = constants;
  let data = [];
  const s3Content = await getContentTypesInS3();
  const toPoll = {};
  for (let x = 0; x < contentTypeNames.length; x += 1) {
    const contentType = contentTypeNames[x];
    const { pattern } = config.contentTypes[contentType]['languages']['und'];
    const count = await strapi.query(contentType).count({ where: filters });
    const { collectionName } = strapi.contentTypes[contentType];
    for (let counter = 0; counter < (count / limit); counter++) {
      let chunkName = '';
      if (counter) chunkName = buildChunkName(collectionName, ext, counter + 1);
      else chunkName = buildChunkName(collectionName, ext);
      data.push({ xslUrl, hostname, contentType, pattern, counter, filters, limit });
      toPoll[chunkName] = s3Content[chunkName] || null;
    }
  }
  const service = 'sitemap';
  let func = 'generateContentType';
  await strapi.plugin('sqs').service('sqs').enqueue(data, pluginId, service, func);
  data = [
    {
      toPoll,
      hostname,
      xslUrl,
    },
  ];
  func = 'pollAndGenerateIndex';
  await strapi.plugin('sqs').service('sqs').enqueue(data, pluginId, service, func);
}

async function getS3LocationForId(id, contentType, limit) {
  const { where: filters, ext } = constants;
  const fields = 'id';
  const sort = {
    id: 'ASC',
  };
  const entities = await strapi.entityService.findMany(contentType, {
    filters,
    fields,
    sort,
  });
  const ids = [];
  entities.forEach((entity) => ids.push(entity.id));
  const chunks = chunk(ids, limit);
  let counter = null;
  for (let x = 0; x < chunks.length; x += 1) {
    if (chunks[x].includes(id)) {
      counter = x;
      break;
    }
  }
  let location = '';
  let chunkName = '';
  if (counter !== null) {
    const { collectionName } = strapi.contentTypes[contentType];
    if (counter) chunkName = buildChunkName(collectionName, ext, counter + 1);
    else chunkName = buildChunkName(collectionName, ext);
    const key = strapi.plugin(pluginId).service('s3').buildKey(chunkName);
    location = strapi.plugin(pluginId).service('s3').getLocation(key);
  }
  return { location, chunkName };
}

async function validateXMLContainsId(id, contentType, location, chunkName) {
  let valid = false;
  const config = await getService('settings').getConfig();
  const { fields, populate } = constants[contentType];
  const entity = await strapi.entityService.findOne(contentType, id, {
    fields,
    populate,
  });
  const { hostname } = config;
  const { pattern } = config.contentTypes[contentType]['languages']['und'];
  const path = strapi.plugins.sitemap.services.pattern.resolvePattern(pattern, entity);
  let url = `${hostname}${path}`;
  url = cleanUrl(url);
  const filepath = `/tmp/${chunkName}`;
  await strapi.plugin(pluginId).service('s3').download(location, filepath);
  const entries = await parseSitemap(createReadStream(filepath));
  for (let x = 0; x < entries.length; x += 1) {
    const entry = entries[x];
    if (entry.url === url) {
      valid = true;
      entry.lastmod = entity.updatedAt;
    }
  }
  if (valid) return entries;
}

async function generateContentTypeOnUpdate(id, contentType, xsl, limit) {
  const { location, chunkName } = await getS3LocationForId(id, contentType, limit);
  const entries = await validateXMLContainsId(id, contentType, location, chunkName);
  if (entries) {
    const config = await getService('settings').getConfig();
    const { hostname } = config;
    const xslKey = strapi.plugin(pluginId).service('s3').buildKey(xsl);
    const xslUrl = strapi.plugin(pluginId).service('s3').getUrl(xslKey);
    const ss = new SitemapStream({
      hostname,
      xslUrl,
    });
    entries.map((entry) => ss.write(entry));
    ss.end();
    const data = await streamToPromise(ss);
    const key = strapi.plugin(pluginId).service('s3').buildKey(chunkName);
    await strapi.plugin(pluginId).service('s3').upload(data, key);
    await generateIndex({ xslUrl, hostname });
  }
}

module.exports = () => ({
  generateIndex,
  generateContentType,
  enqueueContentTypes,
  generateContentTypes,
  pollAndGenerateIndex,
  generateContentTypeOnUpdate,
});
