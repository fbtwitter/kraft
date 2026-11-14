import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const experiments = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/experiments" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum([
      "Forms & input",
      "Navigation & content",
      "Feedback & loading",
      "Browser capabilities",
      "Lists & planning",
    ]),
    tags: z.array(z.string()).default([]),
    publishedAt: z.coerce.date(),
    draft: z.boolean().default(false),
    usesKraftFonts: z.boolean().default(false),
    tipsUrl: z.string().url().optional(),
    preview: z.string().optional(),
    standaloneUrl: z.string().startsWith("/").optional(),
  }),
});

export const collections = { experiments };
