// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const insights = defineCollection({
  type: 'content',
  schema: z.object({
    title:    z.string(),
    date:     z.coerce.date(),
    summary:  z.string(),
    category: z.enum(['Project','Logistics','Agriculture','Technology','Partnership','Media']),
    featured: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title:      z.string(),
    subtitle:   z.string(),
    location:   z.string(),
    category:   z.enum(['Industrial Park','Logistics','Agriculture','Healthcare','Media']),
    status:     z.enum(['Active','In Development','Planned']),
    highlights: z.array(z.string()),
    featured:   z.boolean().default(false),
    order:      z.number().default(99),
  }),
});

export const collections = { insights, projects };
