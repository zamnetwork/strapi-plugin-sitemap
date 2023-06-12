const path = require('path');
const generate = require('./generate');
const Strapi = require('@strapi/strapi');
const { version } = require('../package.json');
const { Command, Option } = require('commander');
const { getService } = require('../server/utils');

(async () => {
  const appDir = '/opt/app';
  const distFolder = 'dist';
  const distDir = path.join(appDir, distFolder);
  await Strapi({ distDir, appDir }).load();

  const config = await getService('settings').getConfig();

  const program = new Command();
  program
    .name('sitemap')
    .description('CLI to work with sitemap in strapi.')
    .version(version);

  program.command('generate')
    .description('Generate sitemap')
    .addOption(new Option('-b, --base', 'Generate base sitemap'))
    .addOption(new Option('-t, --types <string...>', 'Generate content types'))
    .action(generate)

  await program.parseAsync();
  strapi.stop(0);
})();
