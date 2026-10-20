# 蒙古文交互

界面采用中国境内规范传统蒙古文。文字从上到下书写，各列从左向右接续。

- 日程条目按时间上下排列；条目内的标题、地点和备注向右续列。
- 正文按实际字列分页，字号和窗口变化后重新定位列边界。
- 输入法组合结束后执行搜索；输入、保存和显示保留 FVS、MVS、ZWJ、ZWNJ、CGJ 及窄不换行空格。
- 标题在完整词之间缩略，词尾与前词共同测量；详情提供全文。
- 对话框支持 Escape、焦点限制和关闭后的焦点恢复；触控操作保留 44px 点击区域。
- 字号支持 85%–150%，偏好保存到设备。

网页以 React Aria 处理控件，以 `vertical-lr` 排版；Apple 端使用 CoreText 连写与列布局、WebKit 竖排输入。

设计组件参考记录位于 [`src/apple-reference.json`](../src/apple-reference.json)，字体与许可见 [FONT-NOTES.md](../FONT-NOTES.md)。界面词形依据见 [calendar-language-review.json](calendar-language-review.json)，显示变体登记在 [`shared/mongolian-orthography.mjs`](../shared/mongolian-orthography.mjs)。
