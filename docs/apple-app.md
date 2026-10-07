# Apple 应用

`apple/Nutug.xcodeproj` 同时支持 macOS、iPhone 和 iPad。SwiftUI 实现两个主入口、日历与阅读控件；同一份传统蒙古文文案和日期引擎由网页构建提供。WebKit 仅承担可缩放的关系图画布。

## 构建

先准备界面资源，再用 Xcode 打开项目：

```sh
npm ci
npm run build:native
open apple/Nutug.xcodeproj
```

`apple/Resources/public/` 为生成目录，只复制当前构建使用的资源。网页文章和历史数据库由独立内容接口提供。

本地编译：

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project apple/Nutug.xcodeproj -scheme Nutug -configuration Debug \
  -destination 'generic/platform=macOS' -derivedDataPath build/apple-mac \
  CODE_SIGNING_ALLOWED=NO build

DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project apple/Nutug.xcodeproj -scheme Nutug -configuration Debug \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath build/apple-ios \
  CODE_SIGNING_ALLOWED=NO build
```

真机和商店发布通过 Xcode 的 Signing & Capabilities 配置团队、签名和发行资料。上述命令用于开发构建。

## 日期检查

原生端通过 JavaScriptCore 执行固定版本的日期引擎，与网页共用测试向量：

```sh
mkdir -p build
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun swiftc \
  apple/Nutug/CalendarEngine.swift tests/native/CalendarChecks.swift \
  -o build/calendar-check
build/calendar-check "$PWD"
```

## 内容与排版

- 历史页从清单取得版本号和核心资料，下载成功后整体保存到应用自己的数据目录。
- 切换前保留已读取的版本。下载失败时可继续使用缓存。
- CoreText 对完整蒙古文进行连写和分行，再将行转为从左向右的竖排文本列。字体为 Onon Sonin Sans。
- 原生字号设置保存在应用偏好中，长段落与来源链接可横向阅读。
- iPhone 与 iPad 的模拟器测试使用独立设备，保留已有模拟器的应用数据。
