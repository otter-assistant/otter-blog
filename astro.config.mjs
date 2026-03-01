// @ts-check

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import mermaid from "astro-mermaid";
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import rehypeGotoLinks from "./src/plugins/rehypeGotoLinks.ts";
import remarkWikiLinks from "./src/plugins/remarkWikiLinks.ts";

// Get git hash from environment variable
const gitHash = process.env.VITE_GIT_HASH || 'unknown';

// https://astro.build/config
export default defineConfig({
  site: "https://otter-assistant.github.io",
  base: "/",
  integrations: [mdx(), sitemap(), mermaid()],

  build: {
    assets: "assets",
  },

  markdown: {
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['mermaid'],
    },
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
