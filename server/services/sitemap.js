'use strict';

const { createReadStream } = require('fs');
const { SitemapIndexStream, SitemapStream, parseSitemap, streamToPromise } = require('sitemap');
const { pluginId, getService, buildChunkName, delay, cleanUrl } = require('../utils');
const constants = require('../utils/constants');

async function entriesToSitemapStream(entries, hostname, xslUrl) {
  const ss = new SitemapStream({
    hostname,
    xslUrl,
  });
  entries.map((entry) => ss.write(entry));
  ss.end();
  const data = await streamToPromise(ss);
  return data;
}

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
    let splitAt = `${pluginId}/`;
    const { s3: { Key } } = strapi.config.get('plugin.sitemap');
    if (Key) splitAt = `${Key}/${pluginId}/`;
    Contents.forEach((Content) => {
      const { Key: key, LastModified: lastModified } = Content;
      const splitz = key.split(splitAt);
      const xml = splitz[splitz.length - 1];
      xmls[xml] = lastModified.toISOString();
    });
  }
  return xmls;
}

async function generateContentType({ xslUrl, hostname, contentType, counter, filters, limit }) {
  const { collectionName, kind } = strapi.contentTypes[contentType];
  const { fields, populate } = constants[contentType];
  const { ext, singleType } = constants;
  const start = counter * limit;
  const sort = {
    id: 'ASC',
  };
  let entities = [];
  if (kind === singleType) {
    const single = await strapi.entityService.findMany(contentType, {
      filters,
      fields,
      populate,
    });
    if (single) entities.push(single);
  } else {
    entities = await strapi.entityService.findMany(contentType, {
      filters,
      fields,
      populate,
      limit,
      start,
      sort,
    });
  }
  const entries = [];
  const dbLinks = [];
  for (let x = 0; x < entities.length; x += 1) {
    const entity = entities[x];
    const { id: entityId } = entity;
    const { url, lastmod } = await getUrlForEntity(entity, contentType);
    entries.push({
      url,
      lastmod,
    });
    dbLinks.push({
      entityId,
      contentType,
    });
  }
  const data = await entriesToSitemapStream(entries, hostname, xslUrl);
  let chunkName = '';
  if (counter) chunkName = buildChunkName(collectionName, ext, counter + 1);
  else chunkName = buildChunkName(collectionName, ext);
  const key = strapi.plugin(pluginId).service('s3').buildKey(chunkName);
  const location = await strapi.plugin(pluginId).service('s3').upload(data, key);
  dbLinks.forEach((link) => link['chunkName'] = chunkName);
  await strapi.plugin(pluginId).service('sitemap-entity-content-type-link').addOrUpdateMany(dbLinks);
  console.log(`Uploaded sitemap to ${location}`);
  return chunkName;
}

async function generateCustomUrls({ xslUrl, hostname, contentType }) {
  const entities = Object.keys(contentType);
  const { ext, customUrls } = constants;
  const entries = [];
  entities.forEach((entity) => {
    const lastmod = new Date();
    let url = `${hostname}${entity}`;
    url = cleanUrl(url);
    entries.push({
      url,
      lastmod,
    });
  });
  const data = await entriesToSitemapStream(entries, hostname, xslUrl);
  const chunkName = buildChunkName(customUrls, ext);
  const key = strapi.plugin(pluginId).service('s3').buildKey(chunkName);
  const location = await strapi.plugin(pluginId).service('s3').upload(data, key);
  console.log(`Uploaded sitemap to ${location}`);
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

async function generateContentTypes(contentTypes) {
  const config = await getService('settings').getConfig(); // this is read from store
  const pluginConf = strapi.config.get('plugin.sitemap'); // this is read from plugins.ts
  const { hostname } = config;
  const { xsl, limit } = pluginConf;
  const xslKey = strapi.plugin(pluginId).service('s3').buildKey(xsl);
  const xslUrl = strapi.plugin(pluginId).service('s3').getUrl(xslKey);
  const contentTypeNames = Object.keys(contentTypes);
  const s3Content = await getContentTypesInS3();
  const toPoll = {};
  const { customUrls } = constants;
  for (let x = 0; x < contentTypeNames.length; x += 1) {
    const contentType = contentTypeNames[x];
    if (contentType === customUrls) {
      const chunkName = await generateCustomUrls({ xslUrl, hostname, contentType: contentTypes[contentType] });
      toPoll[chunkName] = s3Content[chunkName] || null;
    } else {
      const { where } = constants[contentType];
      const count = await strapi.query(contentType).count({ where });
      for (let counter = 0; counter < (count / limit); counter++) {
        const chunkName = await generateContentType({ xslUrl, hostname, contentType, counter, filters: where, limit });
        toPoll[chunkName] = s3Content[chunkName] || null;
      }
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

async function enqueueContentTypes(contentTypes) {
  const config = await getService('settings').getConfig();
  const pluginConf = strapi.config.get('plugin.sitemap');
  const { hostname } = config;
  const { xsl, limit } = pluginConf;
  const xslKey = strapi.plugin(pluginId).service('s3').buildKey(xsl);
  const xslUrl = strapi.plugin(pluginId).service('s3').getUrl(xslKey);
  const contentTypeNames = Object.keys(contentTypes);
  const { ext } = constants;
  let data = [];
  const s3Content = await getContentTypesInS3();
  const toPoll = {};
  const { customUrls } = constants;
  for (let x = 0; x < contentTypeNames.length; x += 1) {
    const contentType = contentTypeNames[x];
    if (contentType === customUrls) continue;
    const { where } = constants[contentType];
    const count = await strapi.query(contentType).count({ where });
    const { collectionName } = strapi.contentTypes[contentType];
    for (let counter = 0; counter < (count / limit); counter++) {
      let chunkName = '';
      if (counter) chunkName = buildChunkName(collectionName, ext, counter + 1);
      else chunkName = buildChunkName(collectionName, ext);
      data.push({ xslUrl, hostname, contentType, counter, filters: where, limit });
      toPoll[chunkName] = s3Content[chunkName] || null;
    }
  }

  const service = 'sitemap';
  const queue = 'sitemap';
  let func = 'generateContentType';
  await strapi.plugin('sqs').service('sqs').enqueue(data, pluginId, service, func, queue);
  data = [];
  for (let x = 0; x < contentTypeNames.length; x += 1) {
    const contentType = contentTypeNames[x];
    if (contentType !== customUrls) continue;
    data.push({ xslUrl, hostname, contentType: contentTypes[contentType] });
    const chunkName = buildChunkName(customUrls, ext);
    toPoll[chunkName] = s3Content[chunkName] || null;
  }
  if (data.length) {
    func = 'generateCustomUrls';
    await strapi.plugin('sqs').service('sqs').enqueue(data, pluginId, service, func, queue);
  }
  data = [
    {
      toPoll,
      hostname,
      xslUrl,
    },
  ];
  func = 'pollAndGenerateIndex';
  await strapi.plugin('sqs').service('sqs').enqueue(data, pluginId, service, func, queue);
}

async function getS3LocationForId(entityId, contentType) {
  const uid = `plugin::${pluginId}.sitemap-entity-content-type-link`;
  const select = 'chunkName';
  const where = {
    entityId,
    contentType,
  };
  const entry = await strapi.db.query(uid).findOne({
    select,
    where,
  });
  let location = '';
  let chunkName = '';
  if (entry) {
    chunkName = entry.chunkName;
    const key = strapi.plugin(pluginId).service('s3').buildKey(chunkName);
    location = strapi.plugin(pluginId).service('s3').getLocation(key);
  } else console.error('Could not find id in entity content type links');
  return { location, chunkName };
}

async function validateXMLContainsId(id, contentType, location, chunkName) {
  let valid = false;
  const { fields, populate } = constants[contentType];
  const entity = await strapi.entityService.findOne(contentType, id, {
    fields,
    populate,
  });
  const { url } = await getUrlForEntity(entity, contentType);
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

async function generateContentTypeOnUpdate({ id, contentType }) {
  const config = await getService('settings').getConfig();
  const pluginConf = strapi.config.get('plugin.sitemap');
  const { hostname } = config;
  const { xsl, limit } = pluginConf;
  const { location, chunkName } = await getS3LocationForId(id, contentType);
  if (!location) throw new Error('Could not find xml location');
  const entries = await validateXMLContainsId(id, contentType, location, chunkName);
  if (entries) {
    const xslKey = strapi.plugin(pluginId).service('s3').buildKey(xsl);
    const xslUrl = strapi.plugin(pluginId).service('s3').getUrl(xslKey);
    const data = await entriesToSitemapStream(entries, hostname, xslUrl);
    const key = strapi.plugin(pluginId).service('s3').buildKey(chunkName);
    await strapi.plugin(pluginId).service('s3').upload(data, key);
    await generateIndex({ xslUrl, hostname });
  } else await generateContentTypeOnCreation({ id, contentType, xsl, limit });
  // if no entries that means entry does not exist in the expected xml file
  // which means that this entity was just published
  // publish event can only occur after the entity has been saved
  // which means it gets triggered on entity update and not on entity creation
}

async function getS3LocationForLast(contentType, limit) {
  const { ext } = constants;
  const { where } = constants[contentType];
  const count = await strapi.query(contentType).count({ where });
  let counter = null;
  if (count < limit) counter = 0;
  else counter = parseInt(count / limit);
  let chunkName = '';
  const { collectionName } = strapi.contentTypes[contentType];
  if (counter) chunkName = buildChunkName(collectionName, ext, counter + 1);
  else chunkName = buildChunkName(collectionName, ext);
  const key = strapi.plugin(pluginId).service('s3').buildKey(chunkName);
  const location = strapi.plugin(pluginId).service('s3').getLocation(key);
  return { location, chunkName, key };
}

async function appendXML(id, contentType, location, chunkName) {
  const entity = await getEntityForXML(id, contentType);
  const filepath = `/tmp/${chunkName}`;
  await strapi.plugin(pluginId).service('s3').download(location, filepath);
  const entries = await parseSitemap(createReadStream(filepath));
  entries.push(entity);
  return entries;
}

async function getUrlForEntity(entity, contentType) {
  const { uncategorized } = constants;
  const config = await getService('settings').getConfig();
  // for posts with no game assinged, set them as uncategorized
  if (contentType === 'api::post.post' && (!entity.games || !entity.games.length)) {
    entity.games = [
      {
        slug: uncategorized,
      },
    ];
  }
  const { hostname } = config;
  const { pattern } = config.contentTypes[contentType]['languages']['und'];
  const path = strapi.plugins.sitemap.services.pattern.resolvePattern(pattern, entity);
  let url = `${hostname}${path}`;
  url = cleanUrl(url);
  return {
    url,
    lastmod: entity.updatedAt,
  };
}

function getUncategorizedGameSlug() {
  const { uncategorized } = constants;
  return uncategorized;
}

async function getEntityForXML(id, contentType) {
  const { fields, populate } = constants[contentType];
  const entity = await strapi.entityService.findOne(contentType, id, {
    fields,
    populate,
  });
  const { url, lastmod } = await getUrlForEntity(entity, contentType);
  return {
    url,
    lastmod,
  };
}

async function generateContentTypeOnCreation({ id, contentType }) {
  const config = await getService('settings').getConfig();
  const pluginConf = strapi.config.get('plugin.sitemap');
  const { hostname } = config;
  const { xsl, limit } = pluginConf;
  const { location, chunkName, key } = await getS3LocationForLast(contentType, limit);
  const exists = await strapi.plugin(pluginId).service('s3').exists(key);
  const xslKey = strapi.plugin(pluginId).service('s3').buildKey(xsl);
  const xslUrl = strapi.plugin(pluginId).service('s3').getUrl(xslKey);
  let entries = [];
  if (exists) {
    entries = await appendXML(id, contentType, location, chunkName);
  } else {
    const entity = await getEntityForXML(id, contentType);
    entries = [entity];
  }
  const data = await entriesToSitemapStream(entries, hostname, xslUrl);
  await strapi.plugin(pluginId).service('s3').upload(data, key);
  await generateIndex({ xslUrl, hostname });
}

async function enqueueUpdateContentType(id, contentType) {
  const data = [{
    id,
    contentType,
  }];
  const service = 'sitemap';
  const func = 'generateContentTypeOnUpdate';
  const queue = 'sitemap';
  await strapi.plugin('sqs').service('sqs').enqueue(data, pluginId, service, func, queue);
}

async function enqueueAddEntity(id, contentType) {
  const data = [{
    id,
    contentType,
  }];
  const service = 'sitemap';
  const func = 'generateContentTypeOnCreation';
  const queue = 'sitemap';
  await strapi.plugin('sqs').service('sqs').enqueue(data, pluginId, service, func, queue);
}

module.exports = () => ({
  getEntityForXML,
  generateIndex,
  enqueueAddEntity,
  generateCustomUrls,
  generateContentType,
  enqueueContentTypes,
  generateContentTypes,
  pollAndGenerateIndex,
  entriesToSitemapStream,
  getUncategorizedGameSlug,
  enqueueUpdateContentType,
  generateContentTypeOnUpdate,
  generateContentTypeOnCreation,
});
