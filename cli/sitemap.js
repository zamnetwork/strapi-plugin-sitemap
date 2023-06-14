const { Command } = require('commander');
const { version } = require('../package.json');

(async () => {
  const program = new Command();
  program
    .name('sitemap')
    .description('CLI to work with sitemap in strapi.')
    .version(version);

  program.command('generate', 'Generate sitemap');
  program.command('enqueue', 'Enqueue sitemap');

  await program.parseAsync();
})();
