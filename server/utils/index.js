'use strict';

const { strapi: { name } } = require('../../package.json');
const constants = require('./constants');

const pluginId = name;

const getCoreStore = () => {
  return strapi.store({ type: 'plugin', name: pluginId });
};

const getService = (name) => {
  return strapi.plugin(pluginId).service(name);
};

const logMessage = (msg = '') => `[strapi-plugin-sitemap]: ${msg}`;

const noLimit = async (query, parameters, limit = 100) => {
  let entries = [];
  const amountOfEntries = await query.count(parameters);

  for (let i = 0; i < (amountOfEntries / limit); i++) {
    /* eslint-disable-next-line */
    const chunk = await query.findMany({
      ...parameters,
      limit: limit,
      offset: (i * limit),
    });
    entries = [...chunk, ...entries];
  }

  return entries;
};

const collectionNameToContentType = async (collectionName) => {
  const config = await getService('settings').getConfig();
  const { contentTypes } = config;
  const types = Object.keys(strapi.contentTypes);
  let key = '';
  for (let x = 0; x < types.length; x += 1) {
    const { collectionName: typeName } = strapi.contentTypes[types[x]];
    if (typeName === collectionName) {
      key = types[x];
      break;
    }
  }
  if (key) return { [key]: contentTypes[key] };
};

const getConfigContentTypes = async () => {
  const config = await getService('settings').getConfig();
  const { contentTypes } = config;
  return contentTypes;
};

const getConfigCustomEntries = async () => {
  const config = await getService('settings').getConfig();
  const { customEntries } = config;
  const { customUrls } = constants;
  return { [customUrls]: customEntries };
};

const buildChunkName = (collectionName, ext, counter = '') => {
  return `${collectionName}-${pluginId}${counter}${ext}`;
};

const delay = (time) => {
  console.log(`Waiting for ${time}ms`);
  return new Promise((resolve) => setTimeout(resolve, time));
};

const cleanUrl = (url) => {
  return url.replace(/([^:]\/)\/+/g, "$1");
};

module.exports = {
  delay,
  cleanUrl,
  getService,
  getCoreStore,
  logMessage,
  noLimit,
  pluginId,
  buildChunkName,
  getConfigContentTypes,
  getConfigCustomEntries,
  collectionNameToContentType,
};
