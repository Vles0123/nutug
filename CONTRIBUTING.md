# 参与开发

Nutug 使用静态 HTML、CSS 和 JavaScript。所有网站源码在 `public/`，直接编辑即可；当前没有构建步骤。页面入口与模块关系见 [架构说明](docs/architecture.md)。

## 环境与命令

推荐 Node.js 24（有 nvm 时运行 `nvm use`）。最低兼容版本由 `package.json` 的 `engines.node` 指定。预览服务使用 Python 3。

```sh
npm ci
npm run dev
```

提交前运行：

```sh
npm run format
npm run check
```

`npm run check` 先检查格式，再运行全部回归测试。CI 在 Node.js 22、24、26 上执行同一命令。依赖使用精确版本，变更依赖时同时提交 `package.json` 和 `package-lock.json`。

## 分支与提交

- 从最新 `main` 创建独立分支：`feat/<功能>`、`fix/<问题>`、`refactor/<范围>`、`docs/<主题>` 或 `chore/<事项>`。
- 名称使用简短的小写英文和连字符；不加人名、姓名缩写或个人化前缀。
- 提交标题和 PR 标题直接说明问题或结果。将纯格式调整与业务行为变化分开提交，方便审查。
- PR 描述包含具体行为、验证结果和影响范围。

## 代码与数据

- 使用 UTF-8、LF 换行、两个空格缩进。由 EditorConfig 和 Prettier 统一格式。
- 保留蒙古文的变体选择符、蒙古文元音分隔符和窄不换行空格；不要批量替换或规范化正文。
- 浏览器脚本依赖 HTML 中的加载顺序。改为模块、调整全局变量或拆分文件时，需要同步检查全部页面及测试。
- 保留历史条目的来源、地区、日期和不确定性说明；区分人物、研究空白提示和外部背景人物。
- 日历事件的日期必须逐年核验。中国农历黄历不能标为蒙古历。
- `public/vendor/` 和 `public/fonts/` 保留上游字节及许可，不参与自动格式化。升级黄历引擎时同步更新哈希、测试与第三方说明。
- 不提交密钥、`.env`、`node_modules/`、浏览器报告或单独收集的原始语料压缩包。

## 验证范围

现有测试使用 Node.js 和 jsdom，覆盖数据一致性、页面交互和模拟视口。字体连写、竖排布局、滚动和触摸需要在真实浏览器中补充验证，尤其是 iPhone Safari。修改界面时记录设备或视口、浏览器版本和复现步骤；不能用 DOM 测试通过代替视觉验收。

## 部署与授权

静态站点的发布目录为 `public/`，完整上传其内容与子目录。原始快照使用 `dist/`；既有托管配置迁移时需要相应更新发布目录。仓库 CI 只执行检查。

项目保持 `UNLICENSED`。第三方许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)，字体规则见 [FONT-NOTES.md](FONT-NOTES.md)。
