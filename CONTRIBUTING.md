# 参与开发

Nutug 的 React 界面位于 `src/`，共享内容、字体和第三方黄历引擎位于 `public/`。使用 `npm run dev` 构建并预览。页面入口与模块关系见 [架构说明](docs/architecture.md)。

## 环境与命令

推荐 Node.js 24（有 nvm 时运行 `nvm use`）。最低兼容版本由 `package.json` 的 `engines.node` 指定。构建和预览服务均使用 Node.js。

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
- 名称采用中性的功能或问题描述，使用简短的小写英文和连字符。
- 提交标题和 PR 标题直接说明问题或结果。将纯格式调整与业务行为变化分开提交，方便审查。
- PR 描述包含具体行为、验证结果和影响范围。

## 代码与数据

- 使用 UTF-8、LF 换行、两个空格缩进。由 EditorConfig 和 Prettier 统一格式。
- 逐字保留蒙古文的变体选择符、蒙古文元音分隔符和窄不换行空格。
- 浏览器脚本依赖 HTML 中的加载顺序。改为模块、调整全局变量或拆分文件时，需要同步检查全部页面及测试。
- 保留历史条目的来源、地区、日期和不确定性说明；区分人物、研究空白提示和外部背景人物。
- 日历事件按年份与地区核验，并明确标注所属历法。
- `public/vendor/` 和 `public/fonts/` 按上游原始字节和许可保存。升级黄历引擎时同步更新哈希、测试与第三方说明。
- 本地配置、依赖目录、浏览器报告和原始语料归入 `.gitignore`；提交范围为源码、测试、锁定依赖和项目文档。

## 文案与注释

- 直接说明功能、事实、来源和用户可执行的操作。
- 按条目标注时间、地区、历法和证据范围。
- 界面说明围绕当前页面任务；编校状态集中记录在 editorial 元数据中。
- 测试输出描述已检查的行为与运行环境。

## 验证范围

现有测试使用 Node.js 和 jsdom，覆盖数据一致性、页面交互和模拟视口。字体连写、竖排布局、滚动和触摸需要在真实浏览器中补充验证，尤其是 iPhone Safari。修改界面时记录设备或视口、浏览器版本和复现步骤，分别记录自动化结果与实机观察。

## 部署与授权

运行 `npm run build` 后，完整发布 `public/` 及其子目录。`public/assets/` 为生成资源。原始快照使用 `dist/`；既有托管配置迁移时需要相应更新发布目录。仓库 CI 执行格式与回归检查。

项目保持 `UNLICENSED`。第三方许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)，字体规则见 [FONT-NOTES.md](FONT-NOTES.md)。
