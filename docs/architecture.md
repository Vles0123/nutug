# 网站结构

Nutug 使用 React 展示传统蒙古文历史资料，D3 计算人物与部落的网状关系位置。内容文件、字体和黄历引擎均随静态站点发布，原生客户端可以加载同一组资源。

## 页面与组件

| 页面入口             | 界面                                   |
| -------------------- | -------------------------------------- |
| `index.html`         | 人物关系图；`#knowledge` 打开资料库    |
| `tribes.html`        | 部落关系图和分期筛选                   |
| `tribes-mobile.html` | 部落图的兼容地址，与桌面共享响应式组件 |
| `calendar.html`      | 地区节庆、月份、日期与来源             |
| `almanac.html`       | 以传统蒙古文显示的农历日期和民俗条目   |

`src/main.jsx` 管理导航、选择、阅读器和原生桥接。`Network.jsx` 负责 D3 布局、SVG 连线与可操作节点；`Records.jsx` 负责详情和阅读。`Library.jsx`、`Calendar.jsx` 负责资料库及日期相关页面。`ui.jsx` 封装 React Aria 的按钮、分段选择器、搜索、滑块与对话框。

`src/tokens.css` 保存 Apple Figma 参考中的语义变量，`styles.css` 负责竖排与响应式布局。`apple-reference.json` 保留实际导入的组件节点和读取到的变量，便于核对来源。

## 内容

`public/data.js` 提供 `PEOPLE`、`EDGES`、`EVENTS`、`SOURCES`、`RESEARCH_GAPS` 和 `RELATION_UI`。部落、阅读、节庆和黄历分别保留原有数据文件。`src/content.js` 将这些全局数据适配为共享组件可用的记录，保留来源键、人物关联、部落关联与编辑元数据。

页面先加载数据和固定版本的 `lunar-javascript`、`chinese-almanac-core.js`，再加载编译的 React 界面。所有来源链接使用原始 URL。界面只读取传统蒙古文展示字段。

人物入口支持 `#person=<id>`，资料入口支持 `#article=<id>`，部落入口支持 `#tribe=<id>`。ID 通过自身属性校验后使用。黄历支持 `?date=YYYY-MM-DD`，计算范围为 1901–2100。节庆采用明确的日期清单，今天按数据指定时区计算。

## 构建与运行

`scripts/build-web.mjs` 使用 esbuild 将 React、React Aria、Motion、Lucide 和 D3 编译为 `public/assets/nutug.js` 与 `nutug.css`。构建同时生成五个 HTML 入口和组件库的蒙古文辅助标签。`public/assets/` 为生成目录。

`scripts/dev.mjs` 首次构建后监听源码变化，在 `127.0.0.1:8000` 提供静态文件。部署先运行 `npm run build`，随后发布 `public/`。

旧版 DOM 脚本、样式和 HTML 移至 `tests/fixtures/legacy/`，十组旧测试用于迁移回归对照。发布目录只保留当前界面资源。新的 `interface-check.cjs` 直接加载当前生产构建。

## 原生桥接

网页提供 `window.NutugShell` 的 `setScale`、`command`、`mode`、`person` 和 `tribe` 方法。WebKit 消息处理器 `nutug` 接收 `ready` 与 `record` 事件，记录包含标题、摘要、日期、正文与来源。检测到原生容器时，网页将导航与详情交给原生界面。

## 检查

`scripts/test.cjs` 运行 `tests/*-check.cjs`。测试覆盖来源引用、关系类型、历史数据完整性、日期计算，以及 React 界面的选择、阅读、设置、无效链接与消息桥接。jsdom 的布局值为模拟值；字体成形、文字边界和响应式布局通过真实浏览器检查。
