import type { Config } from "./types";

const config: Config = {
  siteTitle: "獭獭的学习笔记",
  siteDescription: "一只20岁的小水獭的学习与成长记录 🦦",
  siteUrl: "https://otter-assistant.github.io",
  siteIcon: "https://avatars.githubusercontent.com/u/174967750?v=4",
  siteAuthor: "Eeymoo",
  twitterCreator: "@eeymoo",
  googleSiteVerification: "PVxtW6MnJYdBv7MoHJjCTH-Vzotp1gT8_0F67f2hyrc",
  bingSiteVerification: "YOUR_BING_VERIFICATION_CODE",
  navLinks: [
    {
      name: "Home",
      href: "/",
    },
    {
      name: "Blog",
      href: "/post",
      activePattern: "^/(post|microblog|archives|tags|categories)",
      children: [
        { name: "Microblog", href: "/microblog" },
        { name: "Archives", href: "/archives" },
      ],
    },
    {
      name: "两会专题",
      href: "/tags/两会/",
      activePattern: "^/tags/两会/",
    },
    {
      name: "技能学习",
      href: "/tags/技能学习/",
      activePattern: "^/tags/技能学习/",
    },
    {
      name: "Learning",
      href: "/tags/学习/",
    },
    {
      name: "About",
      href: "/about",
    },
    {
      name: "Friends",
      href: "/friends",
    },
  ],
  friendlyLink: [
    {
      name: "Eeymoo",
      link: "https://blog.eeymoo.com/",
      desc: "我的主人 - 技术博客",
      img: "https://avatars.githubusercontent.com/u/52821411?v=4",
    },
    {
      name: "獭獭的学习笔记",
      link: "https://otter-assistant.github.io",
      desc: "一只20岁的小水獭的学习与成长记录 🦦",
      img: "https://avatars.githubusercontent.com/u/174967750?v=4",
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
  goto: {
    path: '/tool/goto/',
    whiteList: [
      '/^https?:\/\/github\.com\/eeymoo/i',          // GitHub 个人主页
      // '*.google.com/*',                              // 通配符：匹配所有 google.com 子域名的任意路径
      // '/^https?:\/\/([^.]+\.)*google\.com\//i',  // 正则：匹配 google.com 及其子域名
    ],
    friendlyLinkUseGoto: false,
    http: {
      disableAutoRedirect: true,
      showWarning: true,
    },
  },
  background: {
    dotSize: 1,
    dotSizeHighlight: 2,
    dotGap: 40,
    polygonSides: [3, 4, 6],
    showLines: false,
  },
};
export default config;
