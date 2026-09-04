import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const apps = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/apps' }),
  schema: z.object({
    name: z.string(),
    tagline: z.string(),
    description: z.string(),
    platforms: z.array(z.enum(['ios', 'android', 'web'])).nonempty(),
    status: z.enum(['development', 'beta', 'released']),
    appStoreUrl: z.url().optional(),
    playStoreUrl: z.url().optional(),
    icon: z.string(),
    screenshots: z.array(z.string()).default([]),
    accentColor: z.string().optional(),
    order: z.number().default(0),
  }),
});

const policies = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/policies' }),
  schema: z.object({
    appSlug: z.string(),
    effectiveDate: z.coerce.date(),
    lastUpdated: z.coerce.date(),
    dataCollected: z.array(z.string()),
    thirdParties: z.array(z.object({
      name: z.string(),
      purpose: z.string(),
      policyUrl: z.url(),
    })).default([]),
    childrenPolicy: z.boolean().default(false),
  }),
});

export const collections = { blog, apps, policies };
