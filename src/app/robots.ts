import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/v1/ingest'],
      },
    ],
    sitemap: 'https://models.m31a.tonmoyinfrastructure.org/sitemap.xml',
  };
}
