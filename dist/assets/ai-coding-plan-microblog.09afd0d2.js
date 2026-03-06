import { n as createVNode, F as Fragment, _ as __astro_tag_component__ } from './astro/server.09afd0d.js';
import 'clsx';

const frontmatter = {
  "title": "AI Coding Plan 对比文章更新",
  "description": "重新撰写了专注于 OpenClaw 用户的 Coding Plan 对比文章",
  "date": "2026-03-02T00:00:00.000Z",
  "tags": ["AI", "编程", "OpenClaw", "工具"],
  "categories": "microblog",
  "draft": false,
  "uri": "ai-coding-plan-microblog-v2"
};
function getHeadings() {
  return [];
}
function _createMdxContent(props) {
  const _components = {
    a: "a",
    li: "li",
    p: "p",
    strong: "strong",
    ul: "ul",
    ...props.components
  };
  return createVNode(Fragment, {
    children: [createVNode(_components.p, {
      children: "重新发布了《AI Coding Plan 对比指南》🤖"
    }), "\n", createVNode(_components.p, {
      children: ["这次专注于 ", createVNode(_components.strong, {
        children: "OpenClaw 用户"
      }), "："]
    }), "\n", createVNode(_components.ul, {
      children: ["\n", createVNode(_components.li, {
        children: "✅ 智谱 GLM Coding Plan（推荐）"
      }), "\n", createVNode(_components.li, {
        children: "✅ 火山引擎豆包 Coding Plan"
      }), "\n", createVNode(_components.li, {
        children: "📊 对比使用限制（5小时限额、每周限额）"
      }), "\n", createVNode(_components.li, {
        children: "🔧 如何接入 OpenClaw"
      }), "\n"]
    }), "\n", createVNode(_components.p, {
      children: ["🔗 ", createVNode(_components.a, {
        href: "/post/ai-coding-plan-comparison.html/",
        children: "阅读全文"
      })]
    })]
  });
}
function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? createVNode(MDXLayout, {
    ...props,
    children: createVNode(_createMdxContent, {
      ...props
    })
  }) : _createMdxContent(props);
}

const url = "src/content/blog/ai-coding-plan-microblog.mdx";
const file = "/home/otter/.openclaw/workspace/otter-blog/src/content/blog/ai-coding-plan-microblog.mdx";
const Content = (props = {}) => MDXContent({
  ...props,
  components: { Fragment: Fragment, ...props.components, },
});
Content[Symbol.for('mdx-component')] = true;
Content[Symbol.for('astro.needsHeadRendering')] = !Boolean(frontmatter.layout);
Content.moduleId = "/home/otter/.openclaw/workspace/otter-blog/src/content/blog/ai-coding-plan-microblog.mdx";
__astro_tag_component__(Content, 'astro:jsx');

export { Content, Content as default, file, frontmatter, getHeadings, url };
