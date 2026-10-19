# 架构

| 层         | 入口与职责                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| 网页       | `src/CalendarWorkspace.jsx` 管理日历；`src/Chronicle.jsx` 管理编年阅读；`src/ui.jsx` 提供交互组件        |
| 共享规则   | `shared/calendar.mjs` 处理日期；`calendar-events.mjs` 处理日程与 ICS；`calendar-themes.mjs` 定义皮肤文件 |
| Apple 应用 | `apple/Nutug/` 使用 SwiftUI、CoreText 和 WebKit，日程规则通过 JavaScriptCore 复用                        |
| 内容       | `content-source/` 为编辑源；`scripts/build-content.mjs` 生成版本清单、目录、索引和文章 JSON              |
| 客户端缓存 | `src/content-client.mjs` 管理 IndexedDB；Service Worker 缓存界面、字体和日期引擎                         |

日历与历史分别构建、启动和存储。日程保存在设备本地；历史客户端先读取缓存，再检查内容版本。皮肤与字号保存在应用偏好中。

`npm run dev` 启动网页（8000）与内容服务（8787）。`npm run package:web` 输出两套独立网站；`npm run build:native` 准备 Apple 工程资源。构建生成文件位于 `public/`、`content-dist/` 和 `apple/Resources/`。

日期入口使用 `?date=YYYY-MM-DD`；人物、文章和部落分别使用 `#person=`、`#article=` 和 `#tribe=`。旧资料入口为 `library.html`、`tribes.html` 和 `almanac.html`。

界面规则见[蒙古文交互](mongolian-interaction.md)，发布与缓存协议见[内容接口](content-api.md)，原生构建见[Apple 应用](apple-app.md)。
