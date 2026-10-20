# Apple 应用

Xcode 工程为 `apple/Nutug.xcodeproj`。`NutugCalendar` 与 `NutugHistory` 分别构建日历、历史应用，支持 macOS、iPhone 和 iPad。

```sh
npm ci
npm run build:native
open apple/Nutug.xcodeproj
```

选择对应 scheme 与运行设备。真机和商店发行在 Signing & Capabilities 中配置开发团队与签名。

## 命令行构建

```sh
xcodebuild -jobs 2 -project apple/Nutug.xcodeproj -scheme NutugCalendar \
  -destination 'generic/platform=macOS' -derivedDataPath build/apple-mac \
  CODE_SIGNING_ALLOWED=NO SDK_STAT_CACHE_ENABLE=NO build

xcodebuild -jobs 2 -project apple/Nutug.xcodeproj -scheme NutugCalendar \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath build/apple-ios \
  CODE_SIGNING_ALLOWED=NO SDK_STAT_CACHE_ENABLE=NO build
```

历史应用使用 `NutugHistory` scheme。

## 检查与存储

`node scripts/native-render-check.mjs` 创建临时 iPhone 模拟器，检查日程、皮肤文件互通、竖排输入和渲染，完成后清理设备。结果位于 `build/native-render-results/`，可用 `NUTUG_RENDER_OUTPUT` 指定目录。CI 同时执行日期与日程规则检查。

日程位于应用容器的 `Application Support/NutugCalendar/appointments.json`；外观与字号使用应用偏好存储。历史内容保存在应用数据目录，下载失败时继续使用缓存。内容源配置见[内容接口](content-api.md)。
