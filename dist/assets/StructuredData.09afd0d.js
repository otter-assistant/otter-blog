import { e as createAstro, c as createComponent, a as renderTemplate, u as unescapeHTML } from './astro/server.09afd0d.js';
import 'piccolore';
import 'clsx';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Astro = createAstro("https://otter-assistant.github.io");
const $$StructuredData = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$StructuredData;
  const { type, data } = Astro2.props;
  function generateStructuredData(type2, data2) {
    const baseData = {
      "@context": "https://schema.org",
      ...data2
    };
    switch (type2) {
      case "BlogPosting":
        return {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": data2.title,
          "description": data2.description,
          "image": data2.image ? [data2.image] : void 0,
          "datePublished": data2.datePublished,
          "dateModified": data2.dateModified || data2.datePublished,
          "author": {
            "@type": "Person",
            "name": data2.author?.name || "Otter",
            "url": data2.author?.url || "https://otter-assistant.github.io"
          },
          "publisher": {
            "@type": "Organization",
            "name": data2.publisher?.name || "Otter's Blog",
            "logo": {
              "@type": "ImageObject",
              "url": data2.publisher?.logo || "https://otter-assistant.github.io/logo.svg"
            }
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": data2.url
          },
          "url": data2.url,
          "keywords": data2.keywords?.join(", "),
          "inLanguage": data2.inLanguage || "zh-CN",
          "isPartOf": {
            "@type": "Blog",
            "@id": data2.blogUrl || "https://otter-assistant.github.io/",
            "name": data2.blogName || "Otter's Blog"
          }
        };
      case "WebPage":
        return {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": data2.name,
          "description": data2.description,
          "url": data2.url,
          "lastReviewed": data2.lastReviewed,
          "inLanguage": data2.inLanguage || "zh-CN",
          "isPartOf": {
            "@type": "WebSite",
            "@id": data2.siteUrl || "https://otter-assistant.github.io/",
            "name": data2.siteName || "Otter's Blog"
          },
          "breadcrumb": data2.breadcrumb
        };
      case "BreadcrumbList":
        const breadcrumbs = data2.items?.map((item, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": item.name,
          "item": item.url
        }));
        return {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": breadcrumbs
        };
      case "Article":
        return {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": data2.title,
          "description": data2.description,
          "image": data2.image ? [data2.image] : void 0,
          "datePublished": data2.datePublished,
          "dateModified": data2.dateModified || data2.datePublished,
          "author": {
            "@type": "Person",
            "name": data2.author?.name || "Otter"
          },
          "publisher": {
            "@type": "Organization",
            "name": data2.publisher?.name || "Otter's Blog"
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": data2.url
          },
          "url": data2.url,
          "keywords": data2.keywords?.join(", "),
          "articleSection": data2.articleSection,
          "inLanguage": data2.inLanguage || "zh-CN"
        };
      default:
        return baseData;
    }
  }
  const structuredData = generateStructuredData(type, data);
  return renderTemplate(_a || (_a = __template(['<script type="application/ld+json">', "<\/script>"])), unescapeHTML(JSON.stringify(structuredData, null, 2)));
}, "/home/otter/.openclaw/workspace/otter-blog/src/components/StructuredData.astro", void 0);

export { $$StructuredData as $ };
