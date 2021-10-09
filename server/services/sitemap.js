'use strict';

/**
 * Sitemap service.
 */

const { SitemapStream, streamToPromise } = require('sitemap');
const { isEmpty } = require('lodash');
const fs = require('fs');

/**
 * Get a formatted array of different language URLs of a single page.
 *
 * @param {object} page - The entity.
 * @param {string} contentType - The model of the entity.
 * @param {string} pattern - The pattern of the model.
 * @param {string} defaultURL - The default URL of the different languages.
 * @param {bool} excludeDrafts - whether to exclude drafts.
 *
 * @returns {array} The language links.
 */
const getLanguageLinks = async (page, contentType, pattern, defaultURL, excludeDrafts) => {
  const config = await strapi.plugins.sitemap.services.config.getConfig();
  if (!page.localizations) return null;

  const links = [];
  links.push({ lang: page.locale, url: defaultURL });

  await Promise.all(page.localizations.map(async (translation) => {
    const translationEntity = await strapi.query(contentType).findOne({
      where: {
        $and: [
          { id: translation.id },
          { id: { $notIn: config.contentTypes[contentType].excluded } },
        ],
        id: translation.id,
        publishedAt: {
          $notNull: excludeDrafts,
        },
      },
      populate: ['localizations'],
    });

    if (!translationEntity) return null;
    const translationUrl = await strapi.plugins.sitemap.services.pattern.resolvePattern(pattern, translationEntity);

    links.push({
      lang: translationEntity.locale,
      url: translationUrl,
    });
  }));

  return links;
};

/**
 * Get a formatted sitemap entry object for a single page.
 *
 * @param {object} page - The entity.
 * @param {string} contentType - The model of the entity.
 * @param {bool} excludeDrafts - Whether to exclude drafts.
 *
 * @returns {object} The sitemap entry data.
 */
const getSitemapPageData = async (page, contentType, excludeDrafts) => {
  const config = await strapi.plugins.sitemap.services.config.getConfig();
  const { pattern } = config.contentTypes[contentType];
  const url = await strapi.plugins.sitemap.services.pattern.resolvePattern(pattern, page);

  return {
    lastmod: page.updatedAt,
    url: url,
    links: await getLanguageLinks(page, contentType, pattern, url, excludeDrafts),
    changefreq: config.contentTypes[contentType].changefreq,
    priority: parseFloat(config.contentTypes[contentType].priority),
  };
};

/**
 * Get array of sitemap entries based on the plugins configurations.
 *
 * @returns {array} The entries.
 */
const createSitemapEntries = async () => {
  const config = await strapi.plugins.sitemap.services.config.getConfig();
  const sitemapEntries = [];

  // Collection entries.
  await Promise.all(Object.keys(config.contentTypes).map(async (contentType) => {
    const excludeDrafts = config.excludeDrafts && strapi.contentTypes[contentType].options.draftAndPublish;
    const pages = await strapi.query(contentType).findMany({
      where: {
        id: {
          $notIn: config.contentTypes[contentType].excluded,
        },
        publishedAt: {
          $notNull: excludeDrafts,
        },
      },
      populate: ['localizations'],
      limit: 0,
    });

    // Add formatted sitemap page data to the array.
    await Promise.all(pages.map(async (page) => {
      const pageData = await getSitemapPageData(page, contentType, excludeDrafts);
      sitemapEntries.push(pageData);
    }));
  }));

  // Custom entries.
  await Promise.all(Object.keys(config.customEntries).map(async (customEntry) => {
    sitemapEntries.push({
      url: customEntry,
      changefreq: config.customEntries[customEntry].changefreq,
      priority: parseFloat(config.customEntries[customEntry].priority),
    });
  }));

  // Custom homepage entry.
  if (config.includeHomepage) {
    const hasHomePage = !isEmpty(sitemapEntries.filter((entry) => entry.url === ''));

    // Only add it when no other '/' entry is present.
    if (!hasHomePage) {
      sitemapEntries.push({
        url: '/',
        changefreq: 'monthly',
        priority: 1,
      });
    }
  }

  return sitemapEntries;
};

/**
 * Write the sitemap xml file in the public folder.
 *
 * @param {string} filename - The file name.
 * @param {SitemapStream} sitemap - The SitemapStream instance.
 *
 * @returns {void}
 */
const writeSitemapFile = (filename, sitemap) => {
  streamToPromise(sitemap)
    .then((sm) => {
      fs.writeFile(`public/sitemap/${filename}`, sm.toString(), (err) => {
        if (err) throw err;
      });
    })
    .catch(() => console.error);
};

/**
 * The main sitemap generation service.
 *
 * @returns {void}
 */
const createSitemap = async () => {
  const config = await strapi.plugins.sitemap.services.config.getConfig();
  const sitemap = new SitemapStream({
    hostname: config.hostname,
    xslUrl: "xsl/sitemap.xsl",
  });

  const sitemapEntries = await createSitemapEntries();
  sitemapEntries.map((sitemapEntry) => sitemap.write(sitemapEntry));
  sitemap.end();

  strapi.log.info('Sitemap has been generated');

  await writeSitemapFile('index.xml', sitemap);
};

module.exports = () => ({
  getLanguageLinks,
  getSitemapPageData,
  createSitemapEntries,
  writeSitemapFile,
  createSitemap,
});
