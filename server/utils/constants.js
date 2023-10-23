module.exports = {
  'api::post.post': {
    fields: [
      'id',
      'slug',
      'title',
      'updatedAt',
      'publishedAt',
    ],
    populate: {
      categories: {
        fields: ['slug'],
      },
      games: {
        fields: ['slug'],
      },
    },
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
      slug: {
        $notNull: true,
      },
      publishedAt: {
        $notNull: true,
      },
    },
  },
  'api::game.game': {
    fields: [
      'id',
      'slug',
      'updatedAt',
    ],
    populate: ['slug', 'updatedAt'],
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
    },
  },
  'api::category.category': {
    fields: [
      'id',
      'slug',
      'updatedAt',
    ],
    populate: {
      parents: {
        fields: ['slug'],
      },
    },
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
    },
  },
  'api::tag.tag': {
    fields: [
      'id',
      'slug',
      'updatedAt',
    ],
    populate: ['slug', 'updatedAt'],
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
    },
  },
  'api::homepage.homepage': {
    fields: [
      'id',
      'updatedAt',
    ],
    populate: ['updatedAt'],
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
    },
  },
  'api::latest-posts-page.latest-posts-page': {
    fields: [
      'id',
      'updatedAt',
    ],
    populate: ['updatedAt'],
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
    },
  },
  'plugin::ffxiv.ffxiv-item': {
    fields: [
      'id',
      'slug',
      'updatedAt',
      'publishedAt',
    ],
    populate: ['slug', 'updatedAt', 'publishedAt'],
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
      slug: {
        $ne: '',
      },
      published_at: {
        $notNull: true,
      },
    },
  },
  'plugin::destiny-two.d2-item': {
    fields: [
      'id',
      'slug',
      'hash',
      'updatedAt',
      'publishedAt',
    ],
    populate: ['slug', 'updatedAt', 'publishedAt', 'hash'],
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
      $and: [
        { slug: {
          $ne: '',
        },
        },
        { publishedAt: {
          $notNull: true,
        },
      },
      ],
    },
  },
  ext: '.xml',
  sitemapIndex: 'sitemap_index.xml',
  singleType: 'singleType',
  customUrls: 'pages',
  uncategorized: 'legacy',
};
