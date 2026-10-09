# Nutug · 蒙古历史与文化图谱

当前完整交付：**v127，2026-10-09**。网站：https://nutug.cn/ 。历史地图：https://nutug.cn/history-map.html 。

对应已发布网站源提交：`0d3681a84388314047f83a9374716643810b5c64`。

仓库继续使用便携源码 ZIP 快照方式。**从根目录 `nutug-v127-source.zip` 解压后，进入其中的 `source/` 目录开发。** v124、v20、v31 等旧包是历史备份，请勿当成当前版本；本次保留旧 v124 原件。GitHub 备份不会自动部署网站。

## 本版内容

- 主知识库 1729 篇，1686 个规范化去重来源 URL。文章数不等于人物图谱规模。
- 人物图谱 32 人、53 条关系、18 个事件；部落图谱 9 节点、16 条关系，另有 8 篇部落阅读。
- 7 个历史地图时期，全部显示可点击蒙古文名称。各时期分别有 5、9、5、5、6、6、5 个可见锚点；共 24 个按时期区分的锚点记录，并非 24 个国家或不同城市。
- 保留日历、黄历、文章内图示/演示、词语解释，以及 v125 的阅读器关闭重开、焦点、导航、对比度和长标题修复。

本轮地图补充：早期金、西夏、西辽、南宋；1235/1256 年的江华岛高丽朝廷、镰仓日本与蒙古治下回鹘区域；1271 年同时代周边；1368 年明南京、高丽开城、京都日本与大都至上都的年内转变。12 世纪页面明确为中后期示意。1256 年上都名称、1271 年大都名称均有后定名说明。详情和数据保留来源与近似范围；不绘制推测疆界。

## 快速预览

预构建的 `dist/` 可直接静态托管，不需要 API 密钥、后端或安装依赖：

```sh
cd source
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

浏览器打开 http://127.0.0.1:8000/ 。请使用 HTTP，不要双击 HTML 使用 file://。

## 安装、构建、测试

要求 Node.js 20+；本次独立交付验证使用 Node.js 24.19.0、jsdom 26.1.0。

```sh
npm ci
npm run build
npm test
npm run serve
```

Node 预览地址：http://127.0.0.1:8080/ 。若系统默认 npm 缓存目录不可写，可用 `npm ci --cache .cache/npm`。

`npm test` 顺序执行 **32 个回归检查**。`npm run test:scale` 是另行运行的合成十万条压力测试，不表示已有十万条真实知识。

## 文件与修改入口

- `content/knowledge-data.js`：主知识库唯一编辑源；修改后运行 `npm run build`，不要直接改生成分片
- `content/history-map.json`：历史地图编辑源；修改后运行 `node scripts/build-history-map.cjs`
- `dist/`：完整可部署静态网站，同时保留应用 JS/CSS/HTML 编辑源
- `dist/knowledge/`：生成的文章分片、清单和搜索索引
- `dist/mongolian-orthography.js`：精确词级正字法/显示变体注册表
- `dist/map/`：预构建自然地理底图、传统蒙古文完整词形轮廓；日常构建不必重新下载地图
- `scripts/`、`tests/`：构建、预览、字形审计和固定回归基线
- `RELEASE_V125.md`、`RELEASE_V126.md`、`RELEASE_V127.md`：分版本改动记录
- `CODEX_HANDOFF.md`：继续开发的上下文与边界；`DELIVERY.md`：本次导出验证

重建地图需要 Python 的 pyshp、Shapely 2、uharfbuzz、fontTools，以及 Natural Earth 的 `ne_10m_land.zip`、`ne_10m_lakes.zip`、`ne_10m_rivers_lake_centerlines.zip`。源 URL、许可和哈希在对应 `dist/map/physical-geography*.json` 中。将 ZIP 放在 `NATURAL_EARTH_RAW` 指向的目录：

```sh
python3 scripts/build-physical-map.py
python3 scripts/build-physical-map.py --stage yesugei-era
python3 scripts/build-physical-map.py --stage yuan1271
```

仅重建蒙古文轮廓可运行 `python3 scripts/build-map-labels.py`。保持整词塑形及全部 FVS/MVS 等控制字符。构建产生的本地 `reports/` 不用于部署。

## 验证与边界

- 导出副本的安装、构建、32 项回归检查通过；运行文件与已发布 v127 逐字节一致
- 地图覆盖时期切换、深链、文章返回、完整词形、点击/键盘选择、1×/2×、手机宽度的标签与圆点间距
- DOM 与静态合成图测试不等于真实 iPhone/Safari 触控或全页视觉验收；新增蒙古文说明仍需母语校对
- 黄历为中国农历民俗资料的蒙古文呈现，不是已验证的蒙古传统历法或科学预测
- Natural Earth 是现代自然地理参照，不是中世纪海岸/河道精确复原；历史点位、迁移线为示意
- 所有第三方作品的事实支持、使用权与未来可访问性仍应分别核查

包内不含 node_modules、Git 历史、账户/部署配置、凭据、私有工作记录、原始研究下载或第三方原始语料 ZIP。字体与依赖许可证保留。文件清单见 `nutug-v127-manifest.json`，交付校验见 `nutug-v127-SHA256SUMS.txt`。

原创代码和编辑内容尚未授予统一开源许可证；归属与材料边界见 `THIRD_PARTY_NOTICES.md`。
