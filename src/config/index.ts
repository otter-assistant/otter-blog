import type { Config } from "./types";

const config: Config = {
  siteTitle: "Eeymoo's Blog",
  siteDescription: "记录、学习、分享技术与生活点滴",
  siteUrl: "https://blog.eeymoo.com",
  siteIcon: "https://avatars.githubusercontent.com/u/174967750?v=4",
  navLinks: [
    {
      name: "Home",
      href: "/",
    },
    {
      name: "Blog",
      href: "/post",
      children: [
        { name: "Microblog", href: "/microblog" },
        { name: "Archives", href: "/archives" },
      ],
    },
    {
      name: "AICG",
      href: "/tags/AICG/",
    },
    {
      name: "Tools",
      href: "/tool",
      children: [
        { name: "Goto", href: "/tool/goto" },
        { name: "Gzip-Compare", href: "/tool/gzip-compare" },
      ],
    },
    {
      name: "Friends",
      href: "/friends",
    },
    // {
    //   name: "donate",
    //   href: "/donate",
    // },
  ],
  friendlyLink: [
    {
      name: "jellyfin",
      link: "https://jellyfin-cn.eeymoo.com/",
      desc: "为中国大陆用户提供高速稳定的 jellyfin 插件镜像服务",
      img: "https://jellyfin-cn.eeymoo.com/assets/icon.png",
    },
    {
      name: "zeroanon",
      link: "https://zeroanon.com/",
      desc: "不做圣经里腐朽的诗集，要做禁书里最惊世骇俗的篇章",
      img: "https://avatars.githubusercontent.com/u/119206123?v=4",
    },
    {
      name: "dreamytzk",
      link: "https://www.antmoe.com/",
      desc: "",
      img: "https://avatars.githubusercontent.com/u/82026204?v=4",
    },
  ],
  donate: {
    etcAddress: "0x5d0738e5904a1c8dad3f6ef71453a61caeebdd9d",
    solAddress: "fkdthsy7cifdnqhsrhm3rt3mchdueubug4uxqykqzdjr",
  },
  comments: {
    system: 'giscus',
    giscus: {
      repo: "eeymoo/eeymoo.github.io",
      repoId: "r_kgdon12345",
      category: "general",
      categoryId: "dic_kwdon123456",
      mapping: "pathname",
      strict: "0",
      reactionsEnabled: "1",
      emitMetadata: "0",
      inputPosition: "top",
      theme: "preferred_color_scheme",
      lang: "zh-cn",
      loading: "lazy",
    },
    gitalk: {
      clientID: "your_github_app_client_id",
      clientSecret: "your_github_app_client_secret",
      repo: "eeymoo.github.io",
      owner: "eeymoo",
      admin: ["eeymoo"],
      language: "zh-cn",
      distractionFreeMode: false,
    },
  },
};
export default config;
