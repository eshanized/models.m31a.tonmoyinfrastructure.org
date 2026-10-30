import { MetadataRoute } from 'next';
import { getAllModels } from '@/lib/catalog';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://models.m31a.tonmoyinfrastructure.org';
  const models = getAllModels();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/models`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs/api`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  const modelRoutes: MetadataRoute.Sitemap = models.map((model) => ({
    url: `${baseUrl}/models/${encodeURIComponent(model.id)}`,
    lastModified: new Date(model.last_seen_at),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [...staticRoutes, ...modelRoutes];
}
