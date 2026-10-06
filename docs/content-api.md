# 独立内容接口

资料会持续增加，界面程序和设备固件可以按各自的节奏发布。Nutug 将资料编译为版本化 JSON，由独立内容源分发。客户端在启动和恢复联网时检查版本，按需要缓存文章。

当前内容入口：

[manifest.json](https://raw.githubusercontent.com/Vles0123/nutug/refs/heads/chore/content-feed/manifest.json)

内容发布在 `chore/content-feed` 分支，界面实现位于 `feat/reading-experience`。通用接口使用 HTTP GET、UTF-8 JSON 和 SHA-256，网页、原生客户端和电子墨水屏设备可以使用同一份内容。

## 接口

| 路径                                       | 内容与用途                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `manifest.json`                            | `schemaVersion`、`revision`、条目数量、类别名称和各资源描述符          |
| `objects/<sha256>.json`                    | 不变的内容对象。单篇文章、网页目录、搜索索引和完整离线包均使用这一格式 |
| `revisions/<revision>/catalog/<page>.json` | 设备目录，从第 0 页开始，每页最多 8 条                                 |

每个资源描述符包含 `path`、`sha256`、`bytes`。路径相对于版本清单所在目录解析。下载后核对响应正文的字节数和 SHA-256，再使用或保存。对象文件保留原始 UTF-8 字节，摘要包括文件末尾的换行。

文章包含 `id`、`title`、`summary`、`paragraphs`、`sources` 等字段；显示文字使用传统蒙古文。`sources` 同时保留蒙古文显示名称、引用 URL 和原始书目信息。目录条目中的 `document` 描述符指向完整文章，`sourceKeys` 是规范化引用 URL 的 SHA-256 前 16 位，用于查找引用同一来源的资料。小型设备目录只包含导航和下载所需的字段。

清单中的 `locale` 为 `mn-Mong`，`writingMode` 为 `vertical-lr`。客户端显示时保留变体选择符、蒙古文元音分隔符和窄不换行空格。

## 更新和缓存

1. 启动或联网后请求版本清单。
2. `revision` 相同时继续使用缓存。
3. 有新版本时下载变更的目录和索引，并刷新已缓存且发生变化的文章。
4. 完成校验和缓存后，保存新版清单。正在阅读的窗口保持当前版本，下一次打开或点击更新时启用新版。
5. 下载或校验失败时保留上一份可用快照。

网页在 IndexedDB 中缓存资料。单篇阅读会缓存该文；工具栏的下载菜单可以保存完整资料库。界面文件由单独的 Service Worker 缓存，内容更新与界面更新分别进行。

## 电子墨水屏客户端

主控型号尚未确定时，可以先按以下步骤对接：

- 先读取约 1.7 KB 的清单并比较本地版本。
- 按 `deviceCatalog.path` 将 `{page}` 替换为页号；本版共 61 段，实测每段最大约 3.2 KB。
- 用户选择文章后读取其 `document.path`，按 `bytes` 和 `sha256` 校验。
- 将下载内容写到临时文件，校验通过后替换缓存文件；所需资源就绪后再更新本地版本记录。
- 根据存储容量选择保存常读文章或全部文章。网页专用搜索索引和完整离线包可按设备能力选用。

显示端需要处理传统蒙古文连写与竖排。确定主控、屏幕尺寸和存储容量后，再选择本地字体渲染或预排版图像方案。

## 开发与发布

```sh
npm run build:content
npm run content:dev
```

独立本地内容服务默认位于 `http://127.0.0.1:8787/manifest.json`，支持 CORS 和 ETag。`npm run dev` 同时启动本地内容服务和网页预览。

```sh
NUTUG_CONTENT_MANIFEST=https://example.com/manifest.json npm run build
```

界面构建只输出程序资源到 `public/`。内容源文件位于 `content-source/`，编译结果位于 `content-dist/`。发布内容时保留旧的哈希对象，便于正在阅读旧版本的客户端完成读取。

```sh
npm run content:publish
```

发布脚本先构建内容，再从远端内容分支创建临时检出，补入新对象并提交清单。普通 push 成功后清理临时检出；远端已被其他人更新时保留本次工作供检查。界面分支和编辑中的文件保持原位。GitHub Raw 使用其自身的缓存策略，版本检查可能存在缓存延迟；自托管内容服务可以采用生成的 `_headers` 缓存与 CORS 配置。
