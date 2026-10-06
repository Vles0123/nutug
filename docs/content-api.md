# 独立内容接口

资料与界面分别发布。客户端通过 HTTP GET 读取 UTF-8 JSON，联网时比较一个内容版本号，将需要的资料保存在设备上。

当前内容入口：[manifest.json](https://raw.githubusercontent.com/Vles0123/nutug/refs/heads/chore/content-feed/manifest.json)。内容发布在 `chore/content-feed` 分支。

## 接口

| 路径                                     | 内容与用途                                                  |
| ---------------------------------------- | ----------------------------------------------------------- |
| `manifest.json`                          | `schemaVersion: 2`、`version`、条目数量、类别名称和资源路径 |
| `releases/<version>/core.json`           | 人物、关系、日历配置及共用词表                              |
| `releases/<version>/catalog.json`        | 网页完整目录                                                |
| `releases/<version>/search.json`         | 网页全文搜索索引                                            |
| `releases/<version>/articles/<id>.json`  | 单篇文章                                                    |
| `releases/<version>/offline.json`        | 按文章 ID 索引的完整离线包                                  |
| `releases/<version>/catalog/<page>.json` | 小型设备目录，从第 0 页开始，每页最多 8 条                  |

清单中的 `core`、`catalog`、`search`、`offline` 和目录条目的 `document` 都是相对于清单的路径字符串。每次发布使用新的 `version`；已发布版本保留原文件。默认版本号来自构建时间，也可通过 `CONTENT_VERSION` 指定。

文章包含 `id`、`title`、`summary`、`paragraphs`、`sources` 等字段。显示文字使用传统蒙古文，来源记录保留引用 URL 和原始书目信息。`sourceKeys` 保存规范化引用 URL，用于关联引用相同来源的资料。

共享数据定义与检查位于 `shared/content-contract.mjs`，生成端和网页客户端使用同一份定义。条目 ID、引用、正文和目录数量在这里检查。后续从维基百科整理的来源使用 `kind: wikipedia`，同时记录 `pageId`、`revisionId`、`originalTitle`、`language`、`retrievedAt` 与 `license`。这里的 `revisionId` 指向维基百科原文版本。

`locale` 为 `mn-Mong`，`writingMode` 为 `vertical-lr`。显示时保留蒙古文变体选择符、元音分隔符和窄不换行空格。

## 更新和缓存

1. 启动或恢复联网时请求清单，比较 `version`。
2. 版本相同时直接使用缓存。
3. 版本变化时下载目录和索引，并取得已读文章的新版；选择完整离线保存的设备下载整包。
4. 下载和保存完成后记录新版清单。当前阅读窗口保持原版，下次打开或点击更新时启用新版。
5. 下载中断或资料无法读取时继续使用上一份可用内容，再次联网后可以重试。

网页使用 IndexedDB 保存内容，Service Worker 单独缓存界面和字体。单篇阅读自动缓存该文，工具栏的下载操作保存全部资料。接口第 2 版使用新的内容缓存库；已有网页更新程序后联网读取一次新版内容。

## 电子墨水屏客户端

主控型号确定前，可先按通用文件接口对接：

- 读取清单，将 `version` 与本地版本比较。
- 将 `deviceCatalog.path` 中的 `{page}` 替换为页号，分段读取目录；当前 484 条资料共 61 页。
- 选择文章后读取 `document` 指定的路径。
- 先写临时文件，读取成功后替换缓存；所需资料保存完成后再记录本地版本。
- 按设备容量保存常读文章或全部资料。

传统蒙古文连写与竖排由显示端实现。主控、屏幕和存储容量确定后，再选择本地字体渲染或预排版方案。

## 开发与发布

```sh
npm run build:content
npm run content:dev
```

本地内容服务位于 `http://127.0.0.1:8787/manifest.json`，支持 GET、HEAD 和 CORS。`npm run dev` 同时启动网页与本地内容服务。

```sh
NUTUG_CONTENT_MANIFEST=https://example.com/manifest.json npm run build
npm run content:publish
```

界面构建输出到 `public/`，内容由 `content-source/` 编译到 `content-dist/`。发布脚本从远端内容分支创建临时检出，只复制本次版本目录与清单，保留先前发布的第 2 版内容，然后提交并 push。版本号已经发布时提示更换版本号。远端并发更新导致 push 失败时保留临时检出供检查。

GitHub Raw 的清单更新可能受其缓存延迟影响。自托管服务可采用生成的 `_headers` 配置：清单每次检查，版本目录长期缓存。
