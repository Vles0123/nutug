# Nutug · 蒙古历史与文化图谱

网站：https://nutug.cn/  
交付快照：**v124，2026-10-07**  
对应网站源提交：`1f11e44568d1b90837fac8d0e001bff52e53c932`

## 本次交付

主知识库 **1729 篇文章、1686 个规范化去重来源 URL**；人物图谱 32 人、53 条关系、18 个事件；部落图谱 9 节点、16 条关系，另有 8 篇部落阅读。文章数量不是图谱人物数量。保留历史地图、日历与黄历、五个文章内图示/演示及词语解释。

仓库根目录的 `nutug-v124-source.zip` 是当前完整便携源码。旧 v20/v31 ZIP 仅为历史备份。**先解压 v124，再在解压出的 source 目录开发**，不要对旧包继续修改。继续开发前阅读 `CODEX_HANDOFF.md`。

## 本地运行

预构建网站在 `dist/`，无需 API 密钥、后端或安装依赖即可预览：

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

浏览器打开 http://127.0.0.1:8000/ 。请通过 HTTP 预览，不要双击 HTML 使用 file://。

Node.js 20+（交付验证环境为 24.19.0）：

```sh
npm ci
npm run build
npm test
npm run serve
```

Node 预览地址为 http://127.0.0.1:8080/ 。开发测试依赖固定为 jsdom 26.1.0；依赖不包含在压缩包中。`npm test` 顺序执行 28 个回归检查。`npm run test:scale` 是单独的合成十万条压力测试，不能证明已经有十万条真实知识。

## 目录和更新方法

- `content/knowledge-data.js`：主知识库唯一编辑源
- `dist/`：可直接托管的静态网站，也包含应用 JS/CSS/HTML 源码
- `dist/knowledge/`：由构建脚本生成的分片、清单、搜索索引；不要直接编辑
- `dist/data.js`、`dist/tribes-data.js`、`dist/tribal-knowledge-data.js`：人物、部落图谱及阅读数据
- `dist/mongolian-orthography.js`：精确词级拼写/展示变体注册表
- `scripts/`：知识库构建、地图构建、字形检查、本地预览和测试入口
- `tests/`：回归脚本、固定基线和已审核改字记录；不要随意重置基线

改主知识库后运行 `npm run build`，再运行 `npm test`。字形构建会产生本地 `reports/` 编辑候选清单，不属于部署产物。地图已有预构建数据，日常开发不用重新下载底图。若重建物理地图，另需 Python 的 pyshp、Shapely 2（使用 make_valid）、uharfbuzz、fontTools 和脚本指定的 Natural Earth 原始数据。

## 部署与边界

部署目录是 `dist/`，可用普通静态服务器托管。此次 GitHub 备份不自动部署，也未配置 GitHub Pages、腾讯云迁移或 DNS。当前线上仍使用已有网站托管。

- 界面以传统蒙古文为主，数字使用阿拉伯数字；保留蒙古文竖排与完整词形连接
- 黄历是中国农历民俗数据的蒙古文呈现，不是已验证的蒙古传统历法；不作科学预测或医疗建议
- 蒙古文全文仍需母语者系统校对；自动测试不等于真实 iPhone/Safari 验收
- 地图点位/迁移线具有示意性质，不是精确历史疆界
- 未包含第三方原始语料 ZIP、凭据、部署账户配置或研究原始材料
- 每条来源仍需独立核查事实与使用权；来源字数检查不能替代授权

许可证与第三方归属见 `THIRD_PARTY_NOTICES.md`。原创代码及编辑内容尚未授予统一开源许可证。
