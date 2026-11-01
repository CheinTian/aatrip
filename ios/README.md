# AA簿 iOS

原生 SwiftUI 客户端，与 Web 端共用 Cloudflare Worker + D1 API。

## 打开与运行

```bash
cd ios
xcodegen generate
open AATrip.xcodeproj
```

- 最低系统：iOS 17
- 默认 API：`https://aatrip.chein0813843.workers.dev`
- 本地 API 可在 Scheme 的环境变量中设置 `AATRIP_API_BASE_URL=http://127.0.0.1:8787`
- 本地开发时需要先运行仓库根目录的 `npm run dev`

命令行构建：

```bash
xcodebuild \
  -project ios/AATrip.xcodeproj \
  -scheme AATrip \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  CODE_SIGNING_ALLOWED=NO \
  build
```

## 深链

- `aatrip://trip/<trip-id>`：打开指定行程
- `aatrip://join?code=ABC123`：使用行程码加入

Web 邀请链接仍指向现有 Web 应用；后续如需从邀请链接直接唤起 App，需要为线上域名配置 Associated Domains 和 `apple-app-site-association`。

## 设计方向

iOS 端沿用 Web 端的“随身旅行账簿”视觉语言：

- 森林绿票据式总览卡、暖纸色背景、印章橙主操作
- 系统衬线字体承担品牌标题，SF Pro 承担界面，等宽字体承担金额与行程码
- 原生 `NavigationStack`、`TabView`、`Form`、`List`、`ShareLink`、滑动删除、系统分享与触感反馈
- 完整支持深色模式、Dynamic Type 与 Reduce Motion
