const axios = require('axios');
const settings = require('./settings');

(async () => {
  const { host, route, apiKey, metric, value } = settings;
  const url = `${host}${route}`;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
  };
  const data = [
    {
      metric,
      value,
    },
  ];
  const service = 'news-sitemap';
  const plugin = 'sitemap';
  const queue = 'sitemap';
  const func = 'generate';
  await axios.post(url, { data, service, plugin, queue, func }, { headers });
})();
