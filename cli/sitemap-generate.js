
const path = require('path');
const Strapi = require('@strapi/strapi');
const { Command, Option, InvalidArgumentError } = require('commander');
const { getConfigContentTypes } = require('../server/utils');
const { add, update, contentTypes } = require('./generate');
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
    .name('generate')
    .description('Generate subcommand.')
    .version(version);

  program.command('content-types')
    .description('Generate sitemaps for content types')
    .addOption(new Option('-a, --all', 'Generate for all content types'))
    .addOption(new Option('-t, --types <string...>', 'Content type(s) to generate').choices(choices))
    .action(contentTypes);

  program.command('update')
    .description('Update a single entity in sitemap')
    .requiredOption('-i, --id <number>', 'Id of the entity', myParseInt)
    .addOption(new Option('-t, --type <string>', 'Content type the id belongs to').choices(choices).makeOptionMandatory())
    .addOption(new Option('-x, --xsl', 'Path to xsl file').default('xsl/sitemap.xsl'))
    .addOption(new Option('-l, --limit <number>', 'Number of urls in an xml (Max 50000)').default(1000))
    .action(update);

  program.command('add')
    .description('Add a single entity to sitemap')
    .requiredOption('-i, --id <number>', 'Id of the entity', myParseInt)
    .addOption(new Option('-t, --type <string>', 'Content type the id belongs to').choices(choices).makeOptionMandatory())
    .action(add);

  await program.parseAsync();
  strapi.stop(0);
})();
