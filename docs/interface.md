# 传统蒙古文图谱界面

图谱浏览需要同时保留关系位置与阅读空间。网页使用完整画布、可收起的详情栏，以及专门的竖排阅读弹层。手机显示底部导航和当前选择摘要，完整资料在阅读弹层中展开。

## 组件与设计来源

| 用途                                         | 实现                                |
| -------------------------------------------- | ----------------------------------- |
| 页面和资料状态                               | React 19.3.0                        |
| 按钮、单选分段、搜索、滑块、对话框及焦点管理 | React Aria Components 1.21.1        |
| 导航选择、详情更换、弹层和图谱定位过渡       | Motion 14.0.0，遵循减少动态效果设置 |
| 网页图标                                     | Lucide React 1.51.0                 |
| 网状关系布局                                 | D3 Force 3.0.0                      |
| 静态构建                                     | esbuild 0.28.2                      |

[Apple 官方设计资源](https://developer.apple.com/design/resources/)中的 [iOS/iPadOS 27](https://www.figma.com/community/file/1651309003795292092/ios-and-ipados-27) 是界面参考。以下实例已通过 Figma 连接导入，并读取尺寸、层级和变量：

| 参考实例             | Figma 节点                                                                   | 网页采用的部分                       |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------ |
| Sidebar              | [3:573](https://www.figma.com/design/7yJan1z0YUyrybSRLvlY31?node-id=3-573)   | 导航选择状态、320px 详情栏、搜索入口 |
| Segmented Control    | [3:921](https://www.figma.com/design/7yJan1z0YUyrybSRLvlY31?node-id=3-921)   | 单选语义、圆角轨道、选中填充         |
| Toolbar — Top — iPad | [3:1262](https://www.figma.com/design/7yJan1z0YUyrybSRLvlY31?node-id=3-1262) | 44px 工具按钮、工具分组和间距        |

`src/apple-reference.json` 保存读取结果。`src/tokens.css` 对应 Apple 的 Accents/Blue、Labels/Primary、Labels/Secondary、Fills/Secondary、Fills/Tertiary 和 Segmented Control Selected Fill。浅色强调色为 `#0088ff`，深色为 `#0091ff`。

网页使用 React 组件实现这些布局和行为。竖排导航采用窄侧栏，阅读文字使用 Onon Sonin Sans，数字与界面符号采用系统字体。Apple 示例中的横排 SF Pro 文本尺寸依据传统蒙古文字形与阅读方向作相应调整。

## 文字与交互

- 蒙古文使用 `writing-mode: vertical-lr`；保留原文的变体选择符和窄不换行空格。
- 标题按字形实际宽度排版，允许自然换列。长篇正文在独立阅读区横向滚动。
- 阅读字号为 85%–150%，保存到本地。导航、工具栏保持稳定的操作尺寸。
- 图谱支持节点和连线选择、拖动画布、缩放、适配和当前节点定位；键盘支持 Tab、Enter、方向键、加减和 0 复位。
- React Aria 对话框处理焦点限制、Escape 关闭和焦点恢复。组件库的辅助关闭及清除搜索文案也使用传统蒙古文。
- 本地加载字体、历史内容及运行库；浏览时无需连接 CDN。

## 验证边界

`tests/interface-check.cjs` 检查当前 React 生产构建。其他回归脚本保留历史夹具用于数据及行为对照。发布前另用真实浏览器检查 390px、768px 与桌面视口的文字边界、最大字号和主要导航流程。
