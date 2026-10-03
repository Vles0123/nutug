# Nutug · 蒙古历史与文化图谱

传统蒙古文界面的静态网站，包含人物谱系与政治关系图、部落关系图、历史文化阅读、节庆日历和以蒙古文显示的中国农历黄历。

线上网站：https://nutug.cn/

本仓库是 2026-10-03 的 v20 静态源码快照，源提交为 `7ecdc6b5fa3d54a52f90dab86422b6771e963c56`。导出时仅整理了开发依赖、回归测试和文档，移除了单独的原始语料下载包。

## 本地运行

网站无需构建，也不依赖后端、数据库或 API 密钥。`dist/` 中的 HTML、CSS 和 JavaScript 就是可编辑的网页源码。

在仓库根目录运行：

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

打开 http://127.0.0.1:8000/ 。不建议直接双击 HTML 文件，以免受到浏览器本地文件策略影响。

主要页面：

- `index.html`：人物关系图和知识阅读
- `tribes.html`：部落关系图
- `tribes-mobile.html`：部落关系图移动版
- `calendar.html`：节庆日历
- `almanac.html`：中国农历黄历的蒙古文界面

## 修改源码

- 界面与交互：`dist/*.html`、`dist/*.css`、`dist/*.js`
- 人物与事件：`dist/data.js`
- 知识阅读：`dist/knowledge-data.js`
- 部落及部落阅读：`dist/tribes-data.js`、`dist/tribal-knowledge-data.js`
- 日历事件：`dist/calendar-data.js`
- 黄历文字及算法适配：`dist/almanac-data.js`、`dist/chinese-almanac-core.js`
- 字体：`dist/fonts/`；算法依赖：`dist/vendor/`
- 回归测试：`tests/`

部署时将 `dist/` 作为静态站点根目录，完整保留子目录。网站导航和资源地址使用相对路径。无需上传测试目录。

## 回归测试

黄历核心测试仅需 Node.js：

```sh
node tests/chinese-almanac-core-check.cjs
```

完整测试使用固定版本 `jsdom` 30.1.1。Node.js 要求为 `^22.22.2 || ^24.15.0 || >=26.0.0`；本次已在 Node.js 24.19.0 上验证。

在仓库根目录运行：

```sh
npm ci
npm test
```

也可以在任意工作目录用 `node /path/to/nutug/scripts/test.cjs` 运行；入口会将测试的工作目录设为仓库根目录。

十个回归脚本覆盖人物关系、部落图谱与阅读、移动版选择及分页、知识阅读、节庆日历与黄历。在此源码导出上全部通过。

测试模拟 DOM 和视口，不能替代真实浏览器的蒙古文连写、竖排布局和手机触摸测试。

## 数据范围与注意事项

- 阅读内容是编辑草稿，仍需要蒙古文母语者校对；保留数据中的来源、地区范围、日期和不确定性说明
- 节庆日期不应直接复制到未核验年份；不同地区与历法不能混用
- 黄历使用 `lunar-javascript` 1.7.7，计算范围为 1901–2100 年；它是中国农历传统的实现，不能标为蒙古历或科学预测
- 界面里的健康相关传统宜忌不能作为医疗建议
- 此源码导出不包含另行收集的原始网页语料压缩包；原始语料与本站原创代码的授权范围不同

## 授权与来源

第三方组件的许可及署名必须保留，详见 `THIRD_PARTY_NOTICES.md`：

- Noto Sans Mongolian 字体：SIL Open Font License 1.1
- `lunar-javascript` 1.7.7：MIT License

项目没有为原创网站代码或原创编辑内容声明统一的开源许可证，`package.json` 使用 `UNLICENSED` 防止产生误解。仓库访问权限本身不代表授予额外许可；如要作为开源项目发布，请由权利人明确选择授权方式。引用链接或可公开阅读的资料不自动成为可重新发布的内容。
