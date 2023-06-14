
const path = require('path');
const Strapi = require('@strapi/strapi');
const { Command, Option, InvalidArgumentError } = require('commander');
const { getConfigContentTypes } = require('../server/utils');
const { add, update, contentTypes } = require('./enqueue');
const { version } = require('../package.json');

function myParseInt(value, dummyPrevious) {
  // parseInt takes a string and a radix
  const parsedValue = parseInt(value, 10);
  if (Number.isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not a number.');
  }
  return parsedValue;
}

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

  program.command('update')
    .description('Enqueue update of sitemap for a single entity')
    .requiredOption('-i, --id <number>', 'Id of the entity', myParseInt)
    .addOption(new Option('-t, --type <string>', 'Content type the id belongs to').choices(choices).makeOptionMandatory())
    .addOption(new Option('-x, --xsl', 'Path to xsl file').default('xsl/sitemap.xsl'))
    .addOption(new Option('-l, --limit <number>', 'Number of urls in an xml (Max 50000)').default(1000))
    .action(update);

  program.command('add')
    .description('Enqueue adding a single entity to the sitemap')
    .requiredOption('-i, --id <number>', 'Id of the entity', myParseInt)
    .addOption(new Option('-t, --type <string>', 'Content type the id belongs to').choices(choices).makeOptionMandatory())
    .addOption(new Option('-x, --xsl', 'Path to xsl file').default('xsl/sitemap.xsl'))
    .addOption(new Option('-l, --limit <number>', 'Number of urls in an xml (Max 50000)').default(1000))
    .action(add);

  await program.parseAsync();
  strapi.stop(0);
})();
