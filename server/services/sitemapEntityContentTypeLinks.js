const { factories } = require('@strapi/strapi');

const uid = 'plugin::sitemap.sitemap-entity-content-type-link';
module.exports = factories.createCoreService(
  uid,
  ({ strapi }) => ({
    async addOrUpdateMany(links) {
      const data = [];
      const select = '*';
      for (let x = 0; x < links.length; x += 1) {
        const link = links[x];
        const { entityId, contentType, chunkName } = link;
        const where = {
          entityId,
          contentType,
        };
        const entity = await strapi.db.query(uid).findOne({
          select,
          where,
        });
        if (!entity) data.push(link);
        else {
          const { id, chunkName: entityChunkName } = entity;
          if (entityChunkName !== chunkName) {
            await strapi.db.query(uid).update({
              where: { id },
              data: {
                chunkName,
              },
            });
          }
        }
      }
      if (data.length) {
        await strapi.db.query(uid).createMany({ data });
      }
    },
  }),
);
