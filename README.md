# AA簿

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
- `POST /api/auth/logout`：退出并清除会话
- `GET /api/me/trips`：当前账号创建或加入的行程
- `DELETE /api/me/trips/:id`：离开行程（不删除账本）

未登录时仍可通过 6 位行程码打开共享账本；登录后创建行程会自动成为发起人，使用行程码加入会自动关联同名成员或补建一位成员。

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
