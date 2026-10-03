# Nutug · 蒙古历史与文化图谱

传统蒙古文界面的静态网站，包含人物谱系与政治关系图、部落关系图、历史文化阅读、节庆日历和以蒙古文显示的中国农历黄历。

[网站](https://nutug.cn/) · [开发约定](CONTRIBUTING.md) · [架构说明](docs/architecture.md) · [字体说明](FONT-NOTES.md) · [第三方许可](THIRD_PARTY_NOTICES.md)

## 本地运行

网站由静态 HTML、CSS 和 JavaScript 组成，源码与发布文件位于 `public/`。

安装 Python 3，在仓库根目录启动预览：

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory public
```

打开 <http://127.0.0.1:8000/>。安装 Node.js 后也可运行 `npm run dev`，该命令调用同一个 Python 静态服务器。

## 开发与检查

推荐 Node.js 24，完整兼容范围为 `^22.22.2 || ^24.15.0 || >=26.0.0`。使用 nvm 时可运行 `nvm use` 选择 `.nvmrc` 指定的版本。

```sh
npm ci
npm run check
```

| 命令                        | 作用                                        |
| --------------------------- | ------------------------------------------- |
| `npm run dev` / `npm start` | 在 `127.0.0.1:8000` 预览网站，需要 Python 3 |
| `npm run format`            | 格式化第一方源码、测试和文档                |
| `npm run format:check`      | 报告格式检查结果                            |
| `npm test`                  | 运行全部 10 个回归脚本                      |
| `npm run test:core`         | 使用 Node.js 检查黄历核心与固定第三方引擎   |
| `npm run check`             | 执行格式检查和完整回归测试，与 CI 一致      |

Prettier 与 jsdom 使用锁定版本。GitHub Actions 在 Node.js 22、24、26 上检查每次 push 和 PR。格式化范围为项目源码、测试和文档。

现有回归测试覆盖人物关系、部落图谱与阅读、移动选择及分页、知识阅读、节庆日历和黄历。测试模拟 DOM 和视口；真实浏览器的蒙古文连写、竖排布局、焦点和手机触摸仍需单独验证。

## 仓库目录

```text
public/                  网站源码与静态发布目录
  index.html             人物图谱和知识库
  tribes.html            部落图谱
  tribes-mobile.html     部落图谱移动版
  calendar.html          节庆日历
  almanac.html           中国农历黄历的蒙古文界面
  *-data.js / data.js     内容、关系和来源数据
  fonts/                 字体及 OFL 许可
  vendor/                固定版本黄历引擎及 MIT 许可
tests/                  回归脚本与参考数据
scripts/                测试运行入口
docs/                   架构说明
.github/                CI 与 PR 模板
```

页面依赖顺序、跨页面链接和模块事件见 [架构说明](docs/architecture.md)。修改规范见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 静态部署

将 `public/` 设为静态站点根目录，直接发布该目录的完整内容。页面导航和资源使用相对路径。

原 v20 压缩包中的 `dist/` 已整理为 `public/`。既有托管配置如果指向 `dist/`，接入此分支时需更新发布目录。仓库 CI 负责格式与回归检查。

## 内容范围

- 编辑内容附有来源、地区和日期信息；蒙古文编校状态记录在数据文件的 editorial 字段中。
- 节庆日期按地区、历法与年份核验。
- 黄历使用 `lunar-javascript` 1.7.7，计算范围为 1901–2100 年，展示中国农历日期与传统民俗条目。

## 来源与授权

源码来自仓库初始源码快照提交中保存的 `nutug-source-v20.zip`（2026-10-03）。展开后直接使用 Git 管理各文件，原始压缩包仍可从 Git 历史取回；快照内记录的上游源提交为 `7ecdc6b5fa3d54a52f90dab86422b6771e963c56`。

原创代码与编辑内容的授权标识为 `UNLICENSED`，使用授权由权利人确定。第三方组件保持各自许可：Noto Sans Mongolian 使用 OFL 1.1，`lunar-javascript` 使用 MIT。详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
