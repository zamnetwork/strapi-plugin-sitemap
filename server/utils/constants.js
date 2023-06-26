module.exports = {
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
      published_at: {
        $notNull: true,
      },
    },
  },
  'api::game.game': {
    fields: [
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
  'plugin::ffxiv.ffxiv-item': {
    fields: [
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
        $neq: '',
      },
      published_at: {
        $notNull: true,
      },
    },
  },
  'plugin::destiny-two.d2-item': {
    fields: [
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
        { published_at: {
          $notNull: true,
        },
      },
      ],
    },
  },
  ext: '.xml',
  sitemapIndex: 'sitemap_index.xml',
};
