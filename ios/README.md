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
- Debug 构建可用 `AATRIP_AUTH_TOKEN` 注入测试令牌，用 `AATRIP_OPEN_AUTH=1` 或 `AATRIP_OPEN_MY_TRIPS=1` 直接打开对应页面

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
- `aatrip://auth/callback?code=...`：完成原生 OAuth 登录

Web 邀请链接仍指向现有 Web 应用；后续如需从邀请链接直接唤起 App，需要为线上域名配置 Associated Domains 和 `apple-app-site-association`。

## 登录与我的行程

首页右上角的“登录”会打开账号页，支持 Google 和 GitHub。未配置的提供方会显示为“暂未开通”。登录入口在账号菜单中；登录后右上角显示头像，菜单里可以进入“我的行程”、查看行程角色与支出摘要、打开行程、离开行程或退出登录。行程页左上角的账号按钮也能打开同一份行程清单。

原生登录流程：

1. App 生成 PKCE verifier 和 challenge。
2. `ASWebAuthenticationSession` 打开 Worker 的 `/api/auth/<provider>/start?client=ios`。
3. Worker 完成 OAuth 后跳转 `aatrip://auth/callback?code=<一次性 code>`。
4. App 调用 `POST /api/auth/mobile/exchange` 换取 Bearer token。
5. Token 存入 Keychain，后续 API 请求自动附带 `Authorization: Bearer`。

Google Cloud Console 与 GitHub OAuth App 的回调地址仍配置为 Worker 地址：

- `https://<域名>/api/auth/google/callback`
- `https://<域名>/api/auth/github/callback`

不需要使用内嵌 WebView，也不需要把自定义 Scheme 配成第三方 OAuth 回调。Web 端继续使用 Cookie 会话，iOS 端使用 Bearer 会话，两者共享同一套用户与行程成员关系。

## 设计方向

iOS 端沿用 Web 端的“随身旅行账簿”视觉语言：

- 森林绿票据式总览卡、暖纸色背景、印章橙主操作
- 系统衬线字体承担品牌标题，SF Pro 承担界面，等宽字体承担金额与行程码
- 原生 `NavigationStack`、`TabView`、`Form`、`List`、`ShareLink`、滑动删除、系统分享与触感反馈
- 完整支持深色模式、Dynamic Type 与 Reduce Motion
- 外屏、内屏横竖屏与半折姿态按可用宽度响应；内屏欢迎页与账本使用双栏，大字号下自动恢复单列并纵向重排操作与结算信息
