import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const reviewsCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/reviews" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(), // e.g., "CRM", "Email Marketing", "Developer Tools"
    rating: z.number().min(0).max(10), // Overall rating out of 10
    pricingRange: z.string(), // e.g., "Free to $99/mo"
    targetAudience: z.string(), // e.g., "Small Businesses, Enterprise"
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    bottomLine: z.string(),
    affiliateUrl: z.string().url().optional(),
    publishedAt: z.date()
  }),
});

export const collections = {
  'reviews': reviewsCollection,
};
