type Config = {
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  siteIcon: string;
  siteAuthor?: string;
  twitterCreator?: string;
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  // 导航链接
  navLinks: Array<NavLink>;
  // 友情连接
  friendlyLink: Array<FriendlyLink>;
  // 捐赠地址
  donate?: DonateConfig;
  // 评论系统配置
  comments: CommentsConfig;
  // Goto 跳转配置
  goto?: GotoConfig;
  // 背景点配置
  background?: BackgroundConfig;
};

type GotoConfig = {
  path: string;
  whiteList: string[];
  friendlyLinkUseGoto: boolean;
  http: {
    disableAutoRedirect: boolean;
    showWarning: boolean;
  };
};

type BackgroundConfig = {
  dotSize?: number;
  dotSizeHighlight?: number;
  dotGap?: number;
  polygonSides?: number[];
  showLines?: boolean;
};

type CommentsConfig = {
  system: 'giscus' | 'gitalk';
  giscus?: GiscusConfig;
  gitalk?: GitalkConfig;
};

type DonateConfig = {
  etcAddress?: string;
  solAddress?: string;
};

type GiscusConfig = {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping?: string;
  term?: string;
  strict?: string;
  reactionsEnabled?: string;
  emitMetadata?: string;
  inputPosition?: string;
  theme?: string;
  lang?: string;
  loading?: string;
};

type GitalkConfig = {
  clientID: string;
  clientSecret: string;
  repo: string;
  owner: string;
  admin: string[];
  id?: string;
  distractionFreeMode?: boolean;
  language?: string;
  proxy?: string;
};

type NavLink = {
  name: string;
  href?: string;
  // optional children for dropdowns
  children?: Array<NavLink>;
  // disable clicking on the main item (useful for labels/groups)
  disabled?: boolean;
  // 正则表达式字符串，用于匹配当前路径进行高亮
  activePattern?: string;
};

type FriendlyLink = {
  name: string;
  link: string;
  desc: string;
  img: string;
};
export type { Config, NavLink, FriendlyLink, DonateConfig, GiscusConfig, GitalkConfig, CommentsConfig, GotoConfig, BackgroundConfig };
