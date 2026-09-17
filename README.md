# 红尘笑的小窝

> WA 的一声就哭了 —— 动漫 · 游戏 · 日常 · 技术

这里是 **Redchen（红尘笑）** 的个人博客。用来记录看过的番、玩过的游戏、折腾过的技术，以及一些不值得发朋友圈、却又舍不得丢掉的日常随想。

没有宏大的目标，只想把散落在各处的碎片攒成一个属于自己的小窝。如果这些文字恰好对你有用，那就更好了。

---

## 关于本站

- **站点名称**：红尘笑的小窝
- **作者**：Redchen（kssku）
- **网址**：https://blog.kssku.top
- **定位**：动漫 / 游戏 / 日常 / 技术 杂食向
- **语言**：中文

## 内容分类

| 分类 | 说明 | 入口 |
| --- | --- | --- |
| 随笔 | 日常随想 · 生活记录 | `/categories/life` |
| 日记 | 日常琐事 · 个人日记 | `/categories/diary` |
| 游戏评测 | 游戏玩后感 · 推荐 | `/categories/game` |
| 动漫评测 | 动漫观后感 · 点评 | `/categories/anime` |
| 笔记 | 学习与技术笔记 | `/categories/note` |
| 前端 | 前端相关折腾 | `/categories/front-end` |

站点还包含：首页、归档、标签、分类、友链、追番（Bangumi）、音乐、Steam 游戏库、关于 等页面。

## 技术栈

本站基于开源主题 [astro-koharu](https://github.com/cosZone/astro-koharu)（作者 [cosZone](https://github.com/cosZone)）搭建，在其基础上做了个人化改造。

- **框架**：[Astro](https://astro.build/)（静态输出，加载轻快）
- **交互**：[React](https://react.dev/) + [Tailwind CSS](https://tailwindcss.com/)
- **搜索**：[Pagefind](https://pagefind.app/)（无后端全站搜索）
- **评论**：[Giscus](https://giscus.app/)（基于 GitHub Discussions）
- **部署**：Cloudflare Pages
- **其他**：KaTeX 数学公式、Mermaid 图表、Shiki 代码高亮、LQIP 图片占位等

## 本地开发

需要 **Node.js 22.20+** 与 **pnpm**。

```bash
# 安装依赖
pnpm install

# 启动开发服务器（默认 http://localhost:4321）
pnpm dev

# 类型检查
pnpm check

# 构建静态产物到 dist/
pnpm build

# 本地预览构建结果
pnpm preview
```

## 配置

主要配置集中在 `config/` 目录：

- `config/site.yaml` —— 站点信息、导航、评论、SEO、BGM、社交链接等
- `config/i18n-content.yaml` —— 多语言内容配置

修改 `config/site.yaml` 后重新构建即可生效。

## 部署

本项目为纯静态站点，构建产物位于 `dist/`，可直接部署到 **Cloudflare Pages**（当前使用）、Vercel、Netlify 或任意静态托管 / Nginx。

Cloudflare Pages 构建配置参考：

- **构建命令**：`pnpm build`
- **输出目录**：`dist`
- **Node 版本**：22.20 或更高

## 目录结构（节选）

```plain
src/
├── components/    # UI 组件
├── content/blog/  # 博客文章（Markdown）
├── layouts/       # 页面布局
├── lib/           # 工具与配置逻辑
├── pages/         # 路由页面
├── styles/        # 样式
└── i18n/          # 国际化
config/            # 站点配置
public/            # 静态资源
scripts/           # 工具脚本
```

## 鸣谢

- 主题原作者：[cosZone](https://github.com/cosZone) / [astro-koharu](https://github.com/cosZone/astro-koharu)
- 设计灵感来自 Hexo 主题 [Shoka](https://shoka.lostyu.me/)

## License

本项目沿用原主题的 [LICENSE](./LICENSE)。