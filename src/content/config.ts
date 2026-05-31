import { defineCollection, z } from 'astro:content';

const listiclesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    lastUpdated: z.string(),
    quickList: z.array(z.object({
      id: z.string(),
      name: z.string(),
      badge: z.string().optional(),
      score: z.number(),
    })),
    products: z.array(z.object({
      id: z.string(),
      name: z.string(),
      score: z.number(),
      badge: z.string().optional(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      price: z.string(),
      affiliateLink: z.string(),
      description: z.string()
    }))
  })
});

export const collections = {
  'listicles': listiclesCollection,
};
