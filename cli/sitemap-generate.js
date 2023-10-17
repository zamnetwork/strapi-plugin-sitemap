
const path = require('path');
const Strapi = require('@strapi/strapi');
const { Command, Option, InvalidArgumentError } = require('commander');
const constants = require('../server/utils/constants');
const { getConfigContentTypes, getConfigCustomEntries } = require('../server/utils');
const { add, update, contentTypes, news } = require('./generate');
const { version } = require('../package.json');

const { customUrls } = constants;

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

  const choices = [];
  const entityTypes = await getConfigContentTypes();
  if (entityTypes) {
    Object.keys(entityTypes).forEach((entityType) => choices.push(strapi.contentTypes[entityType].collectionName));
  }
  const customEntries = await getConfigCustomEntries();
  if (customEntries) {
    choices.push(customUrls);
  }

  const limitedChoices = choices.filter((item) => item !== customUrls);

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

  program.command('news')
    .description('Generate news sitemap')
    .addOption(new Option('-m, --metric <string>', 'Time metric, days, months, weeks').default('days'))
    .addOption(new Option('-v, --value <number>', 'Time metric value').default(2))
    .action(news);

  program.command('update')
    .description('Update a single entity in sitemap')
    .requiredOption('-i, --id <number>', 'Id of the entity', myParseInt)
    .addOption(new Option('-t, --type <string>', 'Content type the id belongs to').choices(limitedChoices).makeOptionMandatory())
    .action(update);

  program.command('add')
    .description('Add a single entity to sitemap')
    .requiredOption('-i, --id <number>', 'Id of the entity', myParseInt)
    .addOption(new Option('-t, --type <string>', 'Content type the id belongs to').choices(limitedChoices).makeOptionMandatory())
    .action(add);

  await program.parseAsync();
  strapi.stop(0);
})();
