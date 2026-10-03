# Nutug · 蒙古历史与文化图谱

传统蒙古文界面的静态网站，包含人物谱系与政治关系图、部落关系图、历史文化阅读、节庆日历和以蒙古文显示的中国农历黄历。

[网站](https://nutug.cn/) · [开发约定](CONTRIBUTING.md) · [架构说明](docs/architecture.md) · [字体说明](FONT-NOTES.md) · [第三方许可](THIRD_PARTY_NOTICES.md)

## 本地运行

网页界面使用 React、React Aria Components、Motion、Lucide 与 D3。源码位于 `src/`，内容和本地字体位于 `public/`，esbuild 将界面编译为可静态部署的文件。

安装 Node.js 后，在仓库根目录启动预览：

```sh
npm ci
npm run dev
```

打开 <http://127.0.0.1:8000/tribes.html>。开发服务器先构建网页，再监听组件和样式变化；修改后刷新页面即可查看。

## 开发与检查

推荐 Node.js 24，完整兼容范围为 `^22.22.2 || ^24.15.0 || >=26.0.0`。使用 nvm 时可运行 `nvm use` 选择 `.nvmrc` 指定的版本。

```sh
npm ci
npm run check
```

| 命令                        | 作用                                          |
| --------------------------- | --------------------------------------------- |
| `npm run dev` / `npm start` | 构建并在 `127.0.0.1:8000` 预览网站            |
| `npm run build`             | 构建 React 界面、五个页面入口与蒙古文辅助标签 |
| `npm run format`            | 格式化第一方源码、测试和文档                  |
| `npm run format:check`      | 报告格式检查结果                              |
| `npm test`                  | 构建并运行全部 11 个回归脚本                  |
| `npm run test:core`         | 使用 Node.js 检查黄历核心与固定第三方引擎     |
| `npm run check`             | 执行格式检查和完整回归测试，与 CI 一致        |

Prettier 与 jsdom 使用锁定版本。GitHub Actions 在 Node.js 22、24、26 上检查每次 push 和 PR。格式化范围为项目源码、测试和文档。

`interface-check.cjs` 直接加载生产 React bundle，检查五个入口、图谱筛选、六组完整部落资料、38 篇文章、弹层、字号持久化、URL 校验与原生桥接。原有十组数据和交互回归保留迁移前的 HTML 测试夹具，用于对照历史行为。真实字体、文字边界、触摸和浏览器焦点通过浏览器检查验证。

## 仓库目录

```text
src/                     React 组件、竖排布局、Apple 设计变量
  apple-reference.json   Apple Figma 组件节点与读取到的变量
public/                  共享内容和静态发布目录
  assets/                构建生成的 JavaScript、CSS 与辅助文案
  index.html             人物图谱和知识库
  tribes.html            部落图谱
  tribes-mobile.html     同一响应式界面的兼容入口
  calendar.html          节庆日历
  almanac.html           中国农历黄历的蒙古文界面
  *-data.js / data.js     内容、关系和来源数据
  fonts/                 Onon Sonin Sans、Noto 及原始许可说明
  vendor/                固定版本黄历引擎及 MIT 许可
tests/                   回归脚本与历史 HTML 夹具
scripts/                 构建、预览与测试入口
docs/                   架构说明
.github/                CI 与 PR 模板
```

页面依赖顺序、跨页面链接和模块事件见 [架构说明](docs/architecture.md)。修改规范见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 静态部署

运行 `npm ci && npm run build`，将 `public/` 设为静态站点根目录并发布完整内容。`public/assets/` 由构建生成，未纳入 Git。页面导航和资源使用相对路径，网页与原生 WebKit 内容可以使用同一构建结果。

界面参考 Apple 官方 iOS/iPadOS 27 组件库的侧栏、工具栏和分段选择器。真实组件实例与来源保存在 [Figma 参考文件](https://www.figma.com/design/7yJan1z0YUyrybSRLvlY31)，网页实现与竖排适配规则见 [界面说明](docs/interface.md)。

原 v20 压缩包中的 `dist/` 已整理为 `public/`。既有托管配置如果指向 `dist/`，接入此分支时需更新发布目录。仓库 CI 负责格式与回归检查。

## 内容范围

- 编辑内容附有来源、地区和日期信息；蒙古文编校状态记录在数据文件的 editorial 字段中。
- 节庆日期按地区、历法与年份核验。
- 黄历使用 `lunar-javascript` 1.7.7，计算范围为 1901–2100 年，展示中国农历日期与传统民俗条目。

## 来源与授权

源码来自仓库初始源码快照提交中保存的 `nutug-source-v20.zip`（2026-10-03）。展开后直接使用 Git 管理各文件，原始压缩包仍可从 Git 历史取回；快照内记录的上游源提交为 `7ecdc6b5fa3d54a52f90dab86422b6771e963c56`。

原创代码与编辑内容的授权标识为 `UNLICENSED`，使用授权由权利人确定。第三方组件保持各自许可：Noto Sans Mongolian 使用 OFL 1.1，`lunar-javascript` 使用 MIT。详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
