# 参与开发

使用 Node.js 24，在仓库根目录运行：

```sh
npm ci
npm run dev
```

提交前运行 `npm run format` 和 `npm run check`。CI 检查 Node.js 22、24、26；涉及 Apple 界面的改动同时检查原生构建与渲染。

- 分支使用 `feat/`、`fix/`、`refactor/`、`docs/` 或 `chore/`，名称简短并描述实际改动。
- 提交与 PR 说明最终行为及验证结果。
- 保留蒙古文控制字符和完整词形，输入与排版规则见[蒙古文交互](docs/mongolian-interaction.md)。
- 内容变更附带来源、地区和日期；接口变更同步更新客户端与测试。
- 界面变更检查手机与桌面的实际文字布局、焦点和主要操作。
- 依赖变更同步提交锁文件及第三方许可说明。

模块入口见[架构](docs/architecture.md)，内容发布见[内容接口](docs/content-api.md)，授权与第三方材料见[许可说明](THIRD_PARTY_NOTICES.md)。
