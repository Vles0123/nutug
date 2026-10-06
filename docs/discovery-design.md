# 沿着内容继续探索

Nutug 的资料增至 484 条之后，平铺目录要求读者先知道自己要找什么。探索入口让读者从六个主题出发，查看当前条目附近的资料，读完再沿关联继续浏览。

## 设计参考与应用

| 参考                                                                                                                                                                           | 采用的交互方式                       | Nutug 中的实现                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------- |
| [Google Arts & Culture：X Degrees of Separation](https://artsandculture.google.com/experiment/x-degrees-of-separation/tgHqISGUjQHkGQ?hl=en)                                    | 从一个文化对象沿关联发现下一个对象   | 点击条目重新展开附近内容，保留前进与后退路径                                  |
| [Google 自适应布局](https://developer.android.com/develop/adaptive-apps/guides/canonical-layouts)                                                                              | 主内容配合相关信息面板               | 宽屏并排显示关系图与摘要，窄屏将摘要置于关系图后                              |
| [Apple 材料规范](https://developer.apple.com/design/human-interface-guidelines/materials)与[搜索规范](https://developer.apple.com/design/human-interface-guidelines/searching) | 清晰的内容和操作层级、稳定的搜索入口 | 阅读内容保持实色；路径控制作为轻量浮层；搜索输入在视图切换时保持原 DOM 和焦点 |
| [Quartz Graph View](https://github.com/quartz-community/graph)（MIT）                                                                                                          | 局部关系、已访问标记、继续发现       | 每次展开最多六个邻近条目，窄画布显示两到三个；已访问节点保留标记              |
| [React Flow](https://github.com/xyflow/xyflow)（MIT）                                                                                                                          | 节点式界面与明确的交互状态           | 用于评估交互模式；现有阅读流程以 React Aria 和 Motion 实现                    |

以上是交互与布局参考。界面组件沿用项目实际导入的 [Apple Figma 资源](https://www.figma.com/design/7yJan1z0YUyrybSRLvlY31)语义变量、分段控件和工具栏尺寸。新探索视图采用项目自有 React 组件，人物和部落图继续使用 D3。

## 连接与阅读

关系排序依次使用共同人物、共同部落、相同规范化引用 URL，以及相同主题。内容构建将引用 URL 转为稳定的 `sourceKeys`，显示每条关系的对应类别。共同引用说明两篇资料引用同一来源，图上的连线用于内容导航。

主题入口、节点标题、摘要、阅读操作和辅助标签使用传统蒙古文。节点上的缩略标题按 Unicode 字素边界截取，完整标题保留在辅助标签和摘要面板中。浏览路径保存在当前视图，正文继续由独立内容接口按需加载。阅读末尾提供三个相关条目。

## 视觉与交互检查

- 布局：主画布和摘要形成明确主次；目录保留单独入口。
- 字体：Onon Sonin Sans 竖排，节点 20–27px，摘要 24–25px，详情标题 31–34px。
- 颜色：沿用白色、系统灰和 Apple 蓝；选中、已访问和可操作状态有明确差异。
- 操作：React Aria 处理点击、键盘和焦点，搜索框在首个字符输入后保持焦点。
- 动效：选中条目移动到中心并更新摘要，遵循减少动态效果设置。
- 适配：窄屏减少同时显示的节点，并检查节点间距、完整标题、主题横向浏览和阅读返回。

图谱使用真实目录和关系元数据，界面直接在浏览器中检查和调整。
