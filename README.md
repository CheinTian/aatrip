# AA簿

面向旅行搭子的 AA 分账 Web 应用。每个行程对应一个共享账本，同行成员可以通过 6 位邀请码加入，记录共同支出并自动计算结算方案。

## 功能

- 新建行程、邀请码加入和多人共享账本
- 成员管理
- 平均分摊和指定金额分摊
- 自动生成较少笔数的转账结算建议
- 支出分类统计、成员余额和明细查看
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

## 部署

```bash
npm run db:migrate:remote
npm run deploy
```

D1 数据库绑定配置位于 `wrangler.toml`，数据库结构由 `migrations/` 中的迁移文件维护。

## 线上地址

https://aatrip.chein0813843.workers.dev
