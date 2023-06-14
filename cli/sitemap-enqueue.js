
const path = require('path');
const Strapi = require('@strapi/strapi');
const { Command, Option } = require('commander');
const { getConfigContentTypes } = require('../server/utils');
const { contentTypes } = require('./enqueue');
const { version } = require('../package.json');

(async () => {
  const appDir = '/opt/app';
  const distFolder = 'dist';
  const distDir = path.join(appDir, distFolder);
  await Strapi({ distDir, appDir }).load();

  const entityTypes = await getConfigContentTypes();
  const choices = [];
  if (entityTypes) {
    Object.keys(entityTypes).forEach((entityType) => choices.push(strapi.contentTypes[entityType].collectionName));
  }

  const program = new Command();
  program
    .name('enqueue')
    .description('Enqueue subcommand.')
    .version(version);

  program.command('content-types')
    .description('Enqueue sitemaps for content types')
    .addOption(new Option('-x, --xsl', 'Path to xsl file').default('xsl/sitemap.xsl'))
    .addOption(new Option('-a, --all', 'Ingest all items'))
    .addOption(new Option('-l, --limit <number>', 'Number of urls in an xml (Max 50000)').default(1000))
    .addOption(new Option('-t, --types <string...>', 'Content type(s) to generate').choices(choices))
    .action(contentTypes);

  await program.parseAsync();
  strapi.stop(0);
})();
