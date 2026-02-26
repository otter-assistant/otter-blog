// @ts-check

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import rehypeGotoLinks from "./src/plugins/rehypeGotoLinks.ts";
import remarkWikiLinks from "./src/plugins/remarkWikiLinks.ts";

// Get git hash from environment variable
const gitHash = process.env.VITE_GIT_HASH || 'unknown';

// https://astro.build/config
export default defineConfig({
  site: "https://blog.eeymoo.com",
  base: "/",
  integrations: [mdx(), sitemap()],

  build: {
    assets: "assets",
  },

  markdown: {
    shikiConfig: {
      theme: "monokai",
      wrap: true,
    },
    remarkPlugins: [remarkWikiLinks],
    rehypePlugins: [rehypeGotoLinks],
  },

  vite: {
    plugins: [tailwindcss()],
    define: {
      'import.meta.env.__version__': JSON.stringify(process.env.VITE_GIT_HASH || gitHash),
    },
    build: {
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name].${gitHash}.js`,
          chunkFileNames: `assets/[name].${gitHash}.js`,
          assetFileNames: `assets/[name].${gitHash}.[ext]`,
        },
      },
    },
  },
});
