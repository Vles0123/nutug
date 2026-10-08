# Apple 应用

`apple/Nutug.xcodeproj` 同时支持 macOS、iPhone 和 iPad。`NutugCalendar` 与 `NutugHistory` 是两个独立 target，Bundle ID 分别为 `cn.nutug.calendar` 与 `cn.nutug.history`。SwiftUI 实现各自的导航、日历与阅读控件；同一份传统蒙古文文案和日期引擎由网页构建提供。WebKit 用于可缩放关系图与竖排蒙古文输入，界面文字均由本地资源提供。

## 构建

先准备界面资源，再用 Xcode 打开项目：

```sh
npm ci
npm run build:native
open apple/Nutug.xcodeproj
```

`apple/Resources/public/` 为生成目录，只复制当前构建使用的资源。网页文章和历史数据库由独立内容接口提供。`NUTUG_CONTENT_MANIFEST` 也会写入原生资源中的 `content-config.json`，可为本地历史预览指定 `http://127.0.0.1:8787/manifest.json`。默认构建使用远端内容源。

本地编译：

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project apple/Nutug.xcodeproj -scheme NutugCalendar -configuration Debug \
  -destination 'generic/platform=macOS' -derivedDataPath build/apple-mac \
  CODE_SIGNING_ALLOWED=NO build

DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project apple/Nutug.xcodeproj -scheme NutugCalendar -configuration Debug \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath build/apple-ios \
  CODE_SIGNING_ALLOWED=NO build
```

将上面的 scheme 换为 `NutugHistory` 即可编译独立历史应用。CI 分别构建两个 scheme。

真机和商店发布通过 Xcode 的 Signing & Capabilities 配置团队、签名和发行资料。上述命令用于开发构建。

## 日期检查

原生端通过 JavaScriptCore 执行固定版本的日期引擎，与网页共用测试向量：

```sh
mkdir -p build
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun swiftc \
  apple/Nutug/CalendarEngine.swift apple/Nutug/Orthography.swift tests/native/CalendarChecks.swift \
  -o build/calendar-check
build/calendar-check "$PWD"
```

## 内容与排版

- 历史页从清单取得版本号和核心资料，下载成功后整体保存到应用自己的数据目录。
- 切换前保留已读取的版本。下载失败时可继续使用缓存。
- CoreText 对完整蒙古文进行连写和分行，再将行转为从左向右的竖排文本列。字体为 Onon Sonin Sans，整词显示变体来自网页与原生共用的登记表。
- 原生字号设置保存在应用偏好中，长段落与来源链接可横向阅读。
- iPhone 与 iPad 的模拟器测试使用独立设备，保留已有模拟器的应用数据。

## 个人日程和外观

日历数据写入当前应用容器的 `Application Support/NutugCalendar/appointments.json`。保存采用文件替换；读取失败时保留原文件。重复日程的单次修改会同时记录原系列的例外和新的独立日程。SwiftUI 设置页提供 ICS 导入导出、周首日、农历显示、字号及四种皮肤。

紧凑布局适用于宽度小于 600 或高度小于 640 的窗口：月历下方保留日期摘要，点击日期展开当天日程。年月、视图、搜索、日程详情和编辑由一个弹层状态协调。

共用日程引擎检查：

```sh
xcrun swiftc apple/Nutug/CalendarEngine.swift tests/native/ScheduleChecks.swift -o build/schedule-check
build/schedule-check "$PWD"
```

编译通过与设备交互验收分别记录。在用户办公期间，仅执行后台编译与自动化逻辑检查，使用隔离的后台模拟器、不打开桌面模拟器窗口或切换应用窗口。

## 原生渲染与存储回归

`node scripts/native-render-check.mjs` 构建单独的 `NutugRenderChecks` 检查 target，创建隔离的 iPhone 模拟器，运行日程保存、重复展开、单次修改、重读、删除撤销和 ICS 往返检查，并渲染月/年/周/日、四种皮肤、设置、编辑、历史、人物和大字号界面。优先使用可用的 iPhone Duo 运行时，其他环境选择兼容的 iPhone。检查完成后移除本次临时设备，不打开桌面模拟器窗口。

结果保存到 `build/native-render-results/`；`NUTUG_RENDER_OUTPUT` 可指定其他路径。竖排编辑框另外核对实际宽度、加载后的文字和 WebKit 渲染。画面检查与存储检查的结果各自记录，构建成功不替代渲染检查。
