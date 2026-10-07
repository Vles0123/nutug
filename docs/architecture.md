# 网站结构

Nutug 使用 React 展示传统蒙古文历史资料，D3 计算人物与部落的网状关系位置。界面与内容分别构建和发布，客户端保存可离线读取的内容，联网后比较版本号。

## 主界面

`ProductApp.jsx` 提供日历和历史两个入口。`MonthCalendar.jsx` 从本地日期引擎计算公历与农历，首次断网也可启动。`Chronicle.jsx` 读取独立历史资料，按事件展示日期、正文、人物与来源。网页历史页使用内容客户端的 `core` 范围，只下载清单和核心资料；原有文章深链保留完整资料客户端。

`calendar-copy.mjs` 与 `ui-copy.mjs` 的文案会写入 `interface-copy.json`，供 SwiftUI 使用。原生端通过同一日期引擎计算、独立缓存历史资料；详情见 [Apple 应用](apple-app.md)。

## 页面与组件

| 页面入口             | 界面                                   |
| -------------------- | -------------------------------------- |
| `index.html`         | 人物关系图；`#knowledge` 打开资料库    |
| `tribes.html`        | 部落关系图和分期筛选                   |
| `tribes-mobile.html` | 部落图的兼容地址，与桌面共享响应式组件 |
| `calendar.html`      | 地区节庆、月份、日期与来源             |
| `almanac.html`       | 以传统蒙古文显示的农历日期和民俗条目   |

`src/bootstrap.jsx` 直接启动主界面；进入历史页或旧资料深链时再加载内容。`main.jsx` 管理导航、选择、阅读器和原生桥接；`Network.jsx` 负责 D3 布局、SVG 连线与可操作节点；`Records.jsx` 负责详情和阅读。`Library.jsx`、`Calendar.jsx` 负责目录与日期页面；`Discovery.jsx` 展示主题、局部关系、摘要和浏览路径，`discovery.mjs` 按目录元数据计算相关资料。`ui.jsx` 封装 React Aria 的操作组件，`ContentControls.jsx` 提供内容检查和离线下载。

`src/tokens.css` 保存 Apple Figma 参考中的语义变量，`styles.css` 与 `reading.css` 负责竖排和响应式布局。`apple-reference.json` 保留实际导入的组件节点和读取到的变量。

## 内容

`content-source/` 保存人物、关系、部落、阅读、节庆和黄历词表。`scripts/build-content.mjs` 编译这些编辑源文件，生成独立的 `content-dist/`：版本清单、共享核心数据、目录、全文搜索索引、单篇文章和离线包。电子墨水屏使用每段最多 8 条的小目录。

`src/content-client.mjs` 通过 HTTP 读取 JSON，按版本路径将内容保存在 IndexedDB。版本号决定是否下载更新，`shared/content-contract.mjs` 定义资料结构与引用检查。启动优先读取完整缓存，随后检查远端清单；恢复联网时再次检查。新版资源就绪后才保存新版清单，当前阅读窗口保留其内容快照。协议与部署入口见 [内容接口](content-api.md)。

`src/content.js` 将已校验的快照适配为组件记录。`catalog.mjs` 统一目录与全局搜索，查询匹配全部关键词并按标题相关性排序。搜索归一化不改变保存和显示的蒙古文原文。正文在打开文章时按需读取。

人物入口支持 `#person=<id>`，资料入口支持 `#article=<id>`，部落入口支持 `#tribe=<id>`，目录查询支持 `?q=<query>`。记录 ID 经 Map 或自身属性校验。`shared/calendar.mjs` 提供公历日期解析和日期引擎适配，携带历法名称、时区及支持范围。现有黄历经此适配层计算，支持 `?date=YYYY-MM-DD`，范围为 1901–2100；节庆采用明确日期清单。`useToday.js` 按内容时区刷新今天，并保留用户选中的其他日期。

## 构建与运行

`scripts/build-web.mjs` 使用 esbuild 将组件编译为带内容哈希的 JavaScript 与 CSS，生成主界面和兼容入口和蒙古文辅助标签。`public/` 包含这些界面文件、本地字体和固定版本日期引擎。资料源文件与 JSON 内容发布目录均独立于界面目录。

`npm run dev` 启动网页 8000 端口与内容 8787 端口，并监听界面源码。`npm run build` 默认使用远端内容源；`NUTUG_CONTENT_MANIFEST` 可指定其他入口。`npm run content:publish` 独立发布资料，保留先前发布的版本目录。

Service Worker 缓存界面、字体和日期引擎；内容由独立客户端缓存。下载菜单只有在内容和界面都准备好后才显示离线完成状态。正式网页使用 HTTPS；本地开发可使用 localhost。

## 原生桥接

网页提供 `window.NutugShell` 的 `setScale`、`command`、`mode`、`person` 和 `tribe` 方法。WebKit 消息处理器 `nutug` 接收 `people`、`ready` 与 `record` 事件，记录包含标题、摘要、日期、正文与来源。人物列表从已加载的内容发送给原生容器，原生搜索无需内嵌一份内容副本。桥接支持内容下载和更新命令。

## 检查

`scripts/test.cjs` 运行 16 个 `tests/*-check.cjs`。生产构建检查包括分页与完整搜索、阅读深链与浏览历史、午夜刷新、标签页、字号及桥接；内容客户端检查按需加载、离线包、版本切换、下载失败回退和设备目录。十组历史回归保留旧 HTML 夹具以对照数据与行为。jsdom 的布局值为模拟值，字体成形、文字边界、滚动和响应式布局另由真实浏览器验证。
