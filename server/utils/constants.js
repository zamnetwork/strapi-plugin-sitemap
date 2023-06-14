module.exports = {
  where: {
    $or: [
      {
        sitemap_exclude: {
          $null: true,
        },
      },
      {
        sitemap_exclude: {
          $eq: false,
        },
      },
    ],
    published_at: {
      $notNull: true,
    },
  },
  'api::post.post': {
    fields: [
      'slug',
      'updatedAt',
      'publishedAt',
    ],
    populate: {
      categories: {
        populate: ['parents'],
        fields: ['slug'],
      },
    },
  },
  ext: '.xml',
  sitemapIndex: 'sitemap_index.xml',
};
