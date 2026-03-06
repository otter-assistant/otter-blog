import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).optional(),
    categories: z.string().optional(),
    draft: z.boolean().default(false),
    uri: z.string().optional(),
  }),
});

export const collections = {
  blog,
};
