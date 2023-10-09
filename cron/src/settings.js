const merge = require('lodash.merge');
const { utils } = require('@zam/service-utils');

const { getSettingsFromPath } = utils;
const { env } = process;

let settings = {
  host: env.CMS_HOST || 'https://cms.fanbyte.com',
  route: env.ENQUEUE_ROUTE || '/api/sqs/enqueue',
  apiKey: env.ENQUEUE_API_KEY || '',
  metric: env.METRIC || 'days',
  value: parseInt(env.VALUE || '2'),
};

const settingsFromFiles = getSettingsFromPath('/vault/secrets');
settings = merge(settings, settingsFromFiles);

module.exports = settings;
