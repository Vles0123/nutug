# Nutug · 日历与编年历史

Nutug 面向传统蒙古文使用者，按“共用底座 → 公历与传统历法日历 → 编年历史与人物关系”的顺序开发。网页、macOS、iPhone、iPad 与后续电子墨水屏共用内容接口，资料按版本更新并保存到设备供离线阅读。

日历与编年历史作为两套独立应用提供。日历管理日期与个人日程；历史按时期和事件阅读，人物关系从历史事件进入。网页可直接预览，Apple 应用项目位于 `apple/`；实现范围见 [产品说明](docs/product-scope.md)。

[网站](https://nutug.cn/) · [开发约定](CONTRIBUTING.md) · [架构说明](docs/architecture.md) · [字体说明](FONT-NOTES.md) · [第三方许可](THIRD_PARTY_NOTICES.md)

## 本地运行

网页界面使用 React、React Aria Components、Motion、Lucide 与 D3。界面源码位于 `src/`，资料源文件位于 `content-source/`，本地字体位于 `public/fonts/`。

安装 Node.js 后，在仓库根目录启动预览：

```sh
npm ci
npm run dev
```

日历打开 <http://127.0.0.1:8000/calendar.html>，历史打开 <http://127.0.0.1:8000/chronicle.html>。开发命令同时启动网页（8000）和独立内容服务（8787）。组件和样式修改后刷新页面即可查看；修改资料后运行 `npm run build:content`，在历史页检查并启用更新。

## 开发与检查

推荐 Node.js 24，完整兼容范围为 `^22.22.2 || ^24.15.0 || >=26.0.0`。使用 nvm 时可运行 `nvm use` 选择 `.nvmrc` 指定的版本。

```sh
npm ci
npm run check
```

| 命令                        | 作用                                            |
| --------------------------- | ----------------------------------------------- |
| `npm run dev` / `npm start` | 构建并在 `127.0.0.1:8000` 预览网站              |
| `npm run build`             | 构建界面、日历与历史入口、字体与离线界面缓存    |
| `npm run build:content`     | 将资料编译为版本清单、目录、搜索索引和单篇 JSON |
| `npm run content:dev`       | 独立预览内容接口                                |
| `npm run content:publish`   | 将内容更新发布到 `chore/content-feed`           |
| `npm run format`            | 格式化第一方源码、测试和文档                    |
| `npm run format:check`      | 报告格式检查结果                                |
| `npm test`                  | 构建内容和界面，运行全部 `tests/*-check.cjs`    |
| `npm run test:core`         | 使用 Node.js 检查黄历核心与固定第三方引擎       |
| `npm run check`             | 执行格式检查和完整回归测试，与 CI 一致          |

Prettier 与 jsdom 使用锁定版本。GitHub Actions 在 Node.js 22、24、26 上检查每次 push 和 PR。格式化范围为项目源码、测试和文档。

`interface-check.cjs` 加载生产 React bundle，检查五个入口、图谱筛选、完整部落资料、484 条目录记录、搜索分页、阅读链接、日期跨天、弹层、字号持久化和原生桥接。内容客户端另有按需加载、离线缓存、版本切换、失败重试和设备目录检查。原有十组数据和交互回归保留迁移前的 HTML 夹具，用于对照历史行为。真实字体、文字边界、触摸和焦点通过浏览器检查验证。

## 仓库目录

```text
src/                     React 组件、竖排布局、Apple 设计变量
  apple-reference.json   Apple Figma 组件节点与读取到的变量
shared/                  内容数据定义、公历日期与历法适配
content-source/          资料、关系、词表和引用的编辑源文件
content-dist/            生成的独立 JSON 内容源（不纳入 Git）
public/                  界面静态发布目录
  assets/                构建生成的 JavaScript、CSS 与辅助文案
  index.html             日历首页
  library.html           既有文化资料与图谱
  tribes.html            部落图谱
  tribes-mobile.html     同一响应式界面的兼容入口
  calendar.html          公历与农历、年/月/周/日、个人日程
  chronicle.html         编年历史与事件中的人物关系
  almanac.html           中国农历黄历的蒙古文界面
  sw.js                  生成的界面离线缓存
  fonts/                 Onon Sonin Sans、Noto 及原始许可说明
  vendor/                固定版本黄历引擎及 MIT 许可
tests/                   回归脚本与历史 HTML 夹具
scripts/                 构建、预览与测试入口
apple/                  macOS、iPhone、iPad 的 SwiftUI 工程
docs/                   架构与构建说明
.github/                CI 与 PR 模板
```

页面依赖顺序、跨页面链接和模块事件见 [架构说明](docs/architecture.md)。修改规范见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## Apple 应用

运行 `npm run build:native`，然后使用 Xcode 打开 `apple/Nutug.xcodeproj`。选择 `NutugCalendar` 或 `NutugHistory` scheme，分别构建独立应用。详细编译、日期测试和签名说明见 [Apple 应用](docs/apple-app.md)。

## 静态部署

运行 `npm ci && npm run package:web`，将 `build/web/calendar/` 和 `build/web/history/` 分别部署到独立域名或子目录。每个目录有自己的首页和离线缓存，缓存更新按部署路径隔离。`public/` 保留开发预览及旧资料页面。构建结果包含界面程序、字体和日期计算引擎；资料从[独立内容清单](https://raw.githubusercontent.com/Vles0123/nutug/refs/heads/chore/content-feed/manifest.json)读取。HTML、界面 bundle 和 Service Worker 均由构建生成。正式站点使用 HTTPS，以启用离线界面缓存。

`NUTUG_CONTENT_MANIFEST=https://example.com/manifest.json npm run build` 可以指定自有内容源。内容编辑后运行 `npm run content:publish` 独立发布，已有客户端会在启动或联网时检查版本。网页、原生客户端和电子墨水屏的对接方式见 [内容接口](docs/content-api.md)。

首页日历独立于历史内容源运行。历史页提供按时间阅读、年份与人物搜索、引用和关联人物关系。既有文化资料与图谱通过 `library.html` 访问，文章和人物片段链接接在该路径后；独立发布包分别提供日历与编年阅读。蒙古文输入与编校记录见 [蒙古文交互说明](docs/mongolian-interaction.md)。

界面参考 Apple 官方 iOS/iPadOS 27 组件库的侧栏、工具栏和分段选择器。真实组件实例与来源保存在 [Figma 参考文件](https://www.figma.com/design/7yJan1z0YUyrybSRLvlY31)，网页实现与竖排适配规则见 [界面说明](docs/interface.md)。

原 v20 压缩包中的 `dist/` 已整理为 `public/`。既有托管配置如果指向 `dist/`，接入此分支时需更新发布目录。仓库 CI 负责格式与回归检查。

日历支持年/月/周/日视图、日程新增与编辑、全天与跨天日程、按日/周/月/年重复、单次修改与例外删除、撤销、搜索和 ICS 导入导出。日程保存在当前设备，皮肤提供明亮、深色、纸面与黑白四种。具体互通范围见 [产品说明](docs/product-scope.md)。

此分支的历史编辑源含 81 条事件、9 个时期，年代覆盖公元前 209 年至 2024 年。事实核对见 [历史来源记录](docs/history-source-review.md)，覆盖范围见 [历史编排](docs/history-coverage.md)。新增传统蒙古文仍在编校阶段；Menksoft 的实际核对进度见 [翻译核对记录](docs/menksoft-review.json)。本地内容构建与远端发布分别进行。

## 内容范围

- 编辑内容附有来源、地区和日期信息；蒙古文编校状态记录在数据文件的 editorial 字段中。
- 节庆日期按地区、历法与年份核验。
- 黄历使用 `lunar-javascript` 1.7.7，计算范围为 1901–2100 年，展示中国农历日期与传统民俗条目。

## 来源与授权

源码基于仓库的 v20 快照，并已整合 main 的 v31 内容增量：主知识库 474 篇、部落资料 8 篇、原始文献入口 2 条。原始压缩包保留于 Git 历史，当前开发直接管理源文件。整合说明见 [v31 内容整合](docs/upstream-sync.md)，来源提交与校验值见 `docs/upstream-v31.json`。

原创代码与编辑内容的授权标识为 `UNLICENSED`，使用授权由权利人确定。第三方组件保持各自许可：Noto Sans Mongolian 使用 OFL 1.1，`lunar-javascript` 使用 MIT。详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 上游源码快照

main 的 v124 交接包已合入本分支。原始交接记录和 1729 篇知识库快照保存在 `docs/upstream/v124/`；当前应用从仓库根目录的 `src/`、`shared/`、`content-source/` 开发。按产品范围移植的内容见 [v124 整合记录](docs/upstream-v124.md)。
