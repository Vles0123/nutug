# 网站结构

Nutug 将传统蒙古文历史内容放在可交互的关系图和阅读器中。浏览器直接加载本地 HTML、CSS、JavaScript、字体和黄历引擎，网站按静态文件部署。

## 页面与模块

| 页面                                | 数据                                                    | 界面与交互                                                                      |
| ----------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `index.html` 人物图谱与知识库       | `data.js`、`knowledge-data.js`                          | `app.js`、`knowledge.js`、`style.css`、`knowledge.css`                          |
| `tribes.html` 部落图谱与阅读        | `data.js`、`tribes-data.js`、`tribal-knowledge-data.js` | `tribes.js`、`tribal-knowledge.js`、`tribes.css`                                |
| `tribes-mobile.html` 移动版部落图谱 | 与桌面版共享数据                                        | 共享部落模块，追加 `tribes-mobile.js` 和 `tribes-mobile.css`                    |
| `calendar.html` 节庆日历            | `calendar-data.js`                                      | `calendar.js`、`calendar.css`                                                   |
| `almanac.html` 中国农历黄历         | `calendar-data.js`、`almanac-data.js`                   | `vendor/lunar-1.7.7.js`、`chinese-almanac-core.js`、`almanac.js`、`almanac.css` |

表中路径均相对于 `public/`。HTML 中先加载数据，再加载交互脚本。大部分交互脚本使用立即执行函数隔离局部变量；人物图谱 `app.js` 仍在页面全局作用域中定义状态和函数。

## 数据与页面通信

- 人物图谱使用 `PEOPLE`、`EDGES`、`EVENTS`、`SOURCES`、`RESEARCH_GAPS` 和 `RELATION_UI`；人物 ID 与来源键在数据间相互引用。
- 知识库使用 `KNOWLEDGE`，通过 `atlas:person-selected` 更新相关阅读，通过 `atlas:focus-person` 跳回图谱。
- 部落图谱使用 `TRIBAL_GRAPH`；部落阅读使用 `TRIBAL_KNOWLEDGE`。两者通过 `tribes:selected`、`tribes:focus` 和 `tribes:reader-open` 通信；移动版追加 `tribes:mobile-screen` 切换屏幕。
- 首页支持 `#person=<id>` 和 `#article=<id>`。部落桌面页面可以按视口重定向至独立移动页面；`?layout=desktop` 保留桌面版。
- 节庆日历使用明确列出的日期与地区；“今天”以 `Asia/Shanghai` 时区计算。黄历适配器同时支持浏览器全局对象和 CommonJS，日期范围为 1901–2100。

## 渲染与资源

图谱使用 SVG 绘制关系线，通过 `foreignObject` 放入 HTML 蒙古文卡片。`writing-mode: vertical-lr` 与本地 Noto Sans Mongolian 字体负责竖排显示。详情、相关阅读和筛选结果主要用 DOM API 与 `textContent` 生成。

字体和黄历引擎均由网站本地提供，其许可和固定版本说明见 [第三方组件](../THIRD_PARTY_NOTICES.md)。

## 检查入口

`scripts/test.cjs` 按文件名排序运行 `tests/*-check.cjs`，将各脚本的工作目录固定为仓库根目录，并设置单脚本超时。十个回归脚本覆盖图谱数据、来源引用、选择与筛选、阅读器、移动分页、日历和黄历。

这些测试主要在 jsdom 中执行，并为布局、视口及部分浏览器 API 提供模拟实现。浏览器原生焦点、字体成形、布局和触摸通过实机检查验证。
