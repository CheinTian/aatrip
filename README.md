# AA簿

![AA簿 · AA Ledger](public/brand/aa-lockup-zh.png)

面向旅行搭子的 AA 分账 Web 应用。每个行程对应一个共享账本，同行成员可以通过 6 位邀请码加入，记录共同支出并自动计算结算方案。

## 功能

- 新建行程、邀请码加入和多人共享账本
- Google / GitHub 登录，集中查看自己创建和加入的行程
- 成员管理
- 平均分摊和指定金额分摊
- 自动生成较少笔数的转账结算建议
- 支出分类统计、成员余额和明细查看
- 全站访问统计（总访问人数与当日访问人数）
- 移动端与桌面端响应式界面

## 技术栈

- React 19
- TypeScript
- Vite
- Cloudflare Workers
- Cloudflare D1

前端静态资源和 Worker API 由同一个 Cloudflare Worker 提供，生产入口为 `worker/index.ts`。

## 本地开发

```bash
npm install
npm run db:migrate:local
npm run dev
```

默认开发地址为 `http://127.0.0.1:8787`。

## 登录配置

登录使用 OAuth 授权码流程，会话保存在 D1，浏览器只持有 HttpOnly 会话 Cookie。Google 端启用 PKCE，GitHub 端通过已验证邮箱识别账号；同一邮箱使用两种方式登录时会归到同一个 AA簿账号。

在 Google Cloud Console 创建 OAuth 2.0 Web 客户端，并添加回调地址：

- 本地：`http://127.0.0.1:8787/api/auth/google/callback`
- 线上：`https://<你的域名>/api/auth/google/callback`

在 GitHub 创建 OAuth App，Authorization callback URL 使用同样的路径：

- 本地：`http://127.0.0.1:8787/api/auth/github/callback`
- 线上：`https://<你的域名>/api/auth/github/callback`

本地把凭据写进 `.dev.vars`（可参考 `.dev.vars.example`）；线上使用 Worker Secret：

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

如果 Worker 前面有自定义域名或反向代理，额外设置 `AUTH_BASE_URL` 为对外访问的站点根地址。未配置的登录方式会在登录弹窗中显示为“暂未开通”。

登录相关接口：

- `GET /api/auth/session`：当前账号与已配置的登录方式
- `GET /api/auth/google/start`、`GET /api/auth/github/start`：发起 OAuth
- `POST /api/auth/mobile/exchange`：iOS 端用一次性 code + PKCE verifier 换取 Bearer 会话
- `POST /api/auth/logout`：退出并清除会话
- `GET /api/me/trips`：当前账号创建或加入的行程
- `DELETE /api/me/trips/:id`：离开行程（不删除账本）

未登录时仍可通过 6 位行程码打开共享账本；登录后创建行程会自动成为发起人，使用行程码加入会自动关联同名成员或补建一位成员。

iOS 端使用 `ASWebAuthenticationSession` 完成授权，OAuth 回调仍然落在 Worker 的 Web 回调地址，因此不需要在 Google Cloud Console 或 GitHub OAuth App 中新增自定义 Scheme。授权完成后 Worker 会跳转 `aatrip://auth/callback?code=...`，App 再用本地 PKCE verifier 换取 30 天 Bearer 会话并存入 Keychain。一次性 code 有效期为 5 分钟，只能消费一次。

## 品牌资产

标识由三部分组成：印章橙的圆角票根、奶油白的 Bodoni 双 A 账页，以及穿过印章的金色路线。双 A 的横杠落在同一条线上，像账本里的对账线；金色路线保留“出发—抵达”的旅行语义。

| 文件 | 用途 |
| --- | --- |
| `public/brand/aa-mark.svg` | 紧凑标记，用于导航和小尺寸场景 |
| `public/brand/aa-mark-route.svg` | 带金色路线的完整标记，用于登录票据和封面 |
| `public/brand/aa-mark-mono.svg` | 单色版，用于印刷或压印 |
| `public/brand/aa-lockup-zh.png` / `aa-lockup-zh-dark.png` | 中文横向锁定图 |
| `public/brand/aa-lockup-en.png` / `aa-lockup-en-dark.png` | 英文横向锁定图 |
| `public/brand/aa-app-icon.svg` / `aa-app-icon-1024.png` | 应用图标 |
| `public/favicon.svg`、`favicon-32.png`、`apple-touch-icon.png` | 站点图标 |

品牌色：暖纸 `#F3F1EB`、森林绿 `#173A2B`、印章橙 `#F05A36`、票据金 `#E5A72D`、奶油白 `#FFFDF7`。字标使用 Noto Serif SC 900，辅助字使用 DM Mono。

使用时保留印章四周至少 1/4 印章宽度的留白；不要改变印章橙色，也不要单独拉伸双 A。深色底使用 `-dark` 锁定图，或在代码中把标记描边设为奶油白。

## 部署

```bash
npm run db:migrate:remote
npm run deploy
```

D1 数据库绑定配置位于 `wrangler.toml`，数据库结构由 `migrations/` 中的迁移文件维护。

## 访问统计

首页通过 `POST /api/visits` 记录一次访问并返回 `{ totalVisitors, todayVisitors, totalViews, todayViews, date }`，其中总访问人数与当日访问人数按匿名访客去重（`GET /api/visits` 只读取不记录）。访客标识是浏览器本地生成的随机 UUID，存在 `localStorage` 的 `aatrip:visitor` 中，服务端不保存 IP 或 User-Agent，日期按 `Asia/Shanghai` 划分。

## 线上地址

https://aatrip.chein0813843.workers.dev

## iOS 客户端

原生 SwiftUI 客户端位于 [`ios/`](ios/)，与 Web 端共用同一套 Worker + D1 API。运行与构建说明见 [`ios/README.md`](ios/README.md)。
