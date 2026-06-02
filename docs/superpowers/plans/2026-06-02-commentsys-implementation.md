# 扫码写评价系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现单店养发门店的扫码写评价 MVP:顾客 3 分钟内写完一条公域评价(支持点评/美团/抖音/小红书 4 平台),差评自动私域拦截并通知店主店长。

**Architecture:** 单仓三应用(pnpm monorepo):顾客端 H5 + 店主端 H5 + Node.js API 服务。SQLite 单文件数据库,DeepSeek LLM 生成文案,阿里云 OSS 存图,企业微信群机器人推送差评。

**Tech Stack:**
- Frontend: Vue 3 + TypeScript + Vite + TailwindCSS + Vue Router + Pinia
- Backend: Node.js + Hono + TypeScript + better-sqlite3
- Tests: Vitest(前后端统一)
- LLM: DeepSeek-V3 API(国内服务器)
- 图片存储: 阿里云 OSS / 本地开发用文件系统
- 短信: 阿里云短信服务
- 通知: 企业微信群机器人 webhook

---

## File Structure

```
commentsys/
├── apps/
│   ├── customer/                 # 顾客端 H5
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── App.vue
│   │   │   ├── router.ts
│   │   │   ├── api.ts                  # 后端 API 客户端
│   │   │   ├── pages/
│   │   │   │   ├── Welcome.vue         # 欢迎打分页
│   │   │   │   ├── PositiveReview.vue  # 公域评价生成页
│   │   │   │   ├── Complaint.vue       # 差评留言页
│   │   │   │   └── ThankYou.vue        # 感谢页
│   │   │   ├── components/
│   │   │   │   ├── StarRating.vue
│   │   │   │   ├── PlatformPicker.vue
│   │   │   │   ├── TagPicker.vue
│   │   │   │   ├── ReviewTextBox.vue
│   │   │   │   ├── PhotoPicker.vue
│   │   │   │   └── WeChatBanner.vue
│   │   │   └── utils/
│   │   │       ├── clipboard.ts        # 复制到剪贴板
│   │   │       ├── appJump.ts          # URL Scheme 跳转 App
│   │   │       └── wechatGuard.ts      # 微信内打开检测
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── admin/                    # 店主/店长后台
│       ├── src/
│       │   ├── main.ts
│       │   ├── App.vue
│       │   ├── router.ts
│       │   ├── api.ts
│       │   ├── store/
│       │   │   └── auth.ts             # Pinia 鉴权 store
│       │   ├── pages/
│       │   │   ├── Login.vue           # 手机号 + 短信码登录
│       │   │   ├── Dashboard.vue       # 数据看板
│       │   │   ├── Complaints.vue      # 差评列表
│       │   │   ├── ComplaintDetail.vue # 差评详情
│       │   │   ├── Photos.vue          # 照片库管理
│       │   │   ├── Settings.vue        # 设置
│       │   │   └── QRCodeExport.vue    # 桌贴二维码导出
│       │   └── components/
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
│
├── server/                       # 后端 API
│   ├── src/
│   │   ├── index.ts                    # 入口
│   │   ├── env.ts                      # 环境变量
│   │   ├── db.ts                       # SQLite 连接 + 迁移
│   │   ├── schema.sql                  # 表结构
│   │   ├── routes/
│   │   │   ├── customer.ts             # 顾客端 API 聚合
│   │   │   ├── admin.ts                # 后台 API 聚合
│   │   │   ├── auth.ts                 # 登录
│   │   │   ├── reviews.ts              # 评价生成与提交
│   │   │   ├── complaints.ts           # 差评
│   │   │   ├── photos.ts               # 照片
│   │   │   ├── stats.ts                # 数据看板
│   │   │   └── config.ts               # 配置(门店、技师、项目)
│   │   ├── services/
│   │   │   ├── llm.ts                  # DeepSeek 调用
│   │   │   ├── templatePool.ts         # 模板变量池
│   │   │   ├── notification.ts         # 企业微信通知
│   │   │   ├── photoStore.ts           # OSS / 本地存储
│   │   │   ├── sms.ts                  # 短信验证码
│   │   │   ├── audit.ts                # 操作日志
│   │   │   └── qrcode.ts               # 二维码生成
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── rateLimit.ts
│   │   └── prompts/
│   │       ├── dianping.ts
│   │       ├── meituan.ts
│   │       ├── douyin.ts
│   │       └── xiaohongshu.ts
│   ├── tests/                          # Vitest 测试
│   ├── data/                           # SQLite 文件
│   ├── package.json
│   └── tsconfig.json
│
├── seed-data/
│   ├── templates/
│   │   ├── dianping.json               # 点评模板变量池种子
│   │   ├── meituan.json
│   │   ├── douyin.json
│   │   └── xiaohongshu.json
│   └── README.md
│
├── docs/
│   └── superpowers/
│       ├── specs/2026-06-02-commentsys-design.md
│       └── plans/2026-06-02-commentsys-implementation.md
│
├── pnpm-workspace.yaml
├── package.json
└── .gitignore
```

---

## Phase Roadmap

| Phase | 目标 | 完成后系统状态 |
|---|---|---|
| 0 | 工程脚手架 | monorepo + 3 应用空壳 + DB + 测试基建,跑得起来 |
| 1 | 顾客端最小闭环(无 AI) | 扫码→打分→分流→提交完整流程,文案先 hardcoded |
| 2 | AI + 模板池 | DeepSeek 调通,4 平台 4 套 prompt,模板兜底 |
| 3 | 后台与鉴权 | 店主/店长可登录,看数据看板,处理差评 |
| 4 | 照片库 | 后台上传图片,顾客端选图,元数据匹配 |
| 5 | 通知与二维码 | 企微推差评、桌贴码导出 |
| 6 | 抛光与部署 | 微信内提示、剪贴板兼容、跳 App、上线 |

---

## Phase 0: 工程脚手架

### Task 0.1: 初始化 monorepo

**Files:**
- Create: `/home/ubuntu/qsy/commentsys/package.json`
- Create: `/home/ubuntu/qsy/commentsys/pnpm-workspace.yaml`
- Create: `/home/ubuntu/qsy/commentsys/.gitignore`
- Create: `/home/ubuntu/qsy/commentsys/.nvmrc`

- [ ] **Step 1: 初始化 git 仓库**

```bash
cd /home/ubuntu/qsy/commentsys
git init
git branch -m main
```

- [ ] **Step 2: 写 `package.json`**

```json
{
  "name": "commentsys",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev:server": "pnpm --filter server dev",
    "dev:customer": "pnpm --filter customer dev",
    "dev:admin": "pnpm --filter admin dev",
    "test": "pnpm -r test",
    "build": "pnpm -r build"
  }
}
```

- [ ] **Step 3: 写 `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "server"
```

- [ ] **Step 4: 写 `.gitignore`**

```
node_modules/
dist/
.env
.env.local
server/data/*.db
server/data/*.db-journal
*.log
.DS_Store
.vscode/
.idea/
coverage/
```

- [ ] **Step 5: 写 `.nvmrc`**

```
20
```

- [ ] **Step 6: 第一次提交**

```bash
git add .
git commit -m "chore: init monorepo"
```

---

### Task 0.2: 后端骨架 (Hono + TypeScript)

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`
- Create: `server/src/env.ts`
- Create: `server/.env.example`
- Create: `server/vitest.config.ts`

- [ ] **Step 1: 写 `server/package.json`**

```json
{
  "name": "server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "@hono/node-server": "^1.13.0",
    "better-sqlite3": "^11.3.0",
    "zod": "^3.23.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.5.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

```bash
cd /home/ubuntu/qsy/commentsys
pnpm install
```

Expected: pnpm 安装成功,生成 `node_modules` 和 `pnpm-lock.yaml`

- [ ] **Step 3: 写 `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: 写 `server/src/env.ts`**

```typescript
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8787),
  DB_PATH: z.string().default('./data/commentsys.db'),
  DEEPSEEK_API_KEY: z.string().optional(),
  ALIYUN_SMS_ACCESS_KEY: z.string().optional(),
  ALIYUN_SMS_SECRET: z.string().optional(),
  ALIYUN_SMS_SIGN: z.string().optional(),
  ALIYUN_OSS_BUCKET: z.string().optional(),
  ALIYUN_OSS_ACCESS_KEY: z.string().optional(),
  ALIYUN_OSS_SECRET: z.string().optional(),
  WECOM_WEBHOOK_URL: z.string().optional(),
  JWT_SECRET: z.string().default('dev-secret-change-me'),
});

export const env = schema.parse(process.env);
```

- [ ] **Step 5: 写 `server/.env.example`**

```
NODE_ENV=development
PORT=8787
DB_PATH=./data/commentsys.db
DEEPSEEK_API_KEY=
ALIYUN_SMS_ACCESS_KEY=
ALIYUN_SMS_SECRET=
ALIYUN_SMS_SIGN=
ALIYUN_OSS_BUCKET=
ALIYUN_OSS_ACCESS_KEY=
ALIYUN_OSS_SECRET=
WECOM_WEBHOOK_URL=
JWT_SECRET=dev-secret-change-me
```

- [ ] **Step 6: 写 `server/src/index.ts`**

```typescript
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { env } from './env.js';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, env: env.NODE_ENV }));

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server listening on http://localhost:${info.port}`);
});
```

- [ ] **Step 7: 写 `server/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 8: 启动 dev,验证 health 接口**

```bash
cd /home/ubuntu/qsy/commentsys
pnpm dev:server
```

新终端:
```bash
curl http://localhost:8787/health
```

Expected: `{"ok":true,"env":"development"}`

- [ ] **Step 9: 提交**

```bash
git add server
git commit -m "feat(server): bootstrap Hono + TypeScript skeleton"
```

---

### Task 0.3: SQLite 数据库 + schema

**Files:**
- Create: `server/src/schema.sql`
- Create: `server/src/db.ts`
- Create: `server/tests/db.test.ts`

- [ ] **Step 1: 写测试 `server/tests/db.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../src/db.js';

describe('database', () => {
  let db: ReturnType<typeof openDb>;

  beforeEach(() => {
    db = openDb(':memory:');
    runMigrations(db);
  });

  it('creates all required tables', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r: any) => r.name);
    expect(tables).toEqual(
      expect.arrayContaining([
        'sessions',
        'reviews',
        'complaints',
        'operators',
        'sms_codes',
        'audit_logs',
        'photos',
        'store_config',
      ]),
    );
  });

  it('inserts and reads a session', () => {
    db.prepare(
      "INSERT INTO sessions (id, store_id, created_at) VALUES (?, ?, ?)",
    ).run('s1', 'store1', Date.now());
    const row = db.prepare("SELECT * FROM sessions WHERE id=?").get('s1') as any;
    expect(row.store_id).toBe('store1');
  });
});
```

- [ ] **Step 2: 跑测试,验证失败**

```bash
cd /home/ubuntu/qsy/commentsys/server
pnpm test
```

Expected: FAIL — `openDb` / `runMigrations` not defined

- [ ] **Step 3: 写 `server/src/schema.sql`**

```sql
-- 会话:一次扫码到完成的链路
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  device_id TEXT,
  user_agent TEXT,
  is_wechat INTEGER DEFAULT 0,
  rating INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

-- 公域评价记录(4-5 星)
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  store_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  platform TEXT NOT NULL,
  project_tags TEXT,
  technician_id TEXT,
  ai_text TEXT,
  edited_text TEXT,
  photo_ids TEXT,
  copied_at INTEGER,
  jumped_to_app INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- 差评(1-3 星)
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  store_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  message TEXT NOT NULL,
  contact TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  handler_id TEXT,
  handler_note TEXT,
  created_at INTEGER NOT NULL,
  handled_at INTEGER
);

-- 操作员(店主+店长)
CREATE TABLE IF NOT EXISTS operators (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  last_login_at INTEGER,
  created_at INTEGER NOT NULL
);

-- 短信验证码
CREATE TABLE IF NOT EXISTS sms_codes (
  phone TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER DEFAULT 0
);

-- 操作日志
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  operator_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  created_at INTEGER NOT NULL
);

-- 照片库
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  platforms TEXT NOT NULL,
  rating_match TEXT NOT NULL,
  tags TEXT,
  use_count INTEGER DEFAULT 0,
  uploaded_by TEXT,
  created_at INTEGER NOT NULL
);

-- 门店配置(单店,只 1 行)
CREATE TABLE IF NOT EXISTS store_config (
  store_id TEXT PRIMARY KEY,
  name TEXT,
  address TEXT,
  phone TEXT,
  platform_urls TEXT,
  wecom_webhook TEXT,
  technicians TEXT,
  projects TEXT,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_reviews_store_created ON reviews(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_store_status ON complaints(store_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_store_created ON sessions(store_id, created_at);
```

- [ ] **Step 4: 写 `server/src/db.ts`**

```typescript
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type DB = Database.Database;

export function openDb(path: string = env.DB_PATH): DB {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function runMigrations(db: DB): void {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
}

let _db: DB | null = null;
export function getDb(): DB {
  if (!_db) {
    _db = openDb();
    runMigrations(_db);
  }
  return _db;
}
```

- [ ] **Step 5: 跑测试,验证通过**

```bash
cd /home/ubuntu/qsy/commentsys/server
pnpm test
```

Expected: PASS

- [ ] **Step 6: 把迁移挂到启动里 — 改 `server/src/index.ts`**

```typescript
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from './env.js';
import { getDb } from './db.js';

mkdirSync(dirname(env.DB_PATH), { recursive: true });
getDb();

const app = new Hono();
app.get('/health', (c) => c.json({ ok: true, env: env.NODE_ENV }));

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server listening on http://localhost:${info.port}`);
});
```

- [ ] **Step 7: 提交**

```bash
git add server
git commit -m "feat(server): add SQLite schema + migrations"
```

---

### Task 0.4: 顾客端 H5 骨架 (Vue 3 + Vite + Tailwind)

**Files:**
- Create: `apps/customer/package.json`
- Create: `apps/customer/vite.config.ts`
- Create: `apps/customer/tsconfig.json`
- Create: `apps/customer/tailwind.config.js`
- Create: `apps/customer/postcss.config.js`
- Create: `apps/customer/index.html`
- Create: `apps/customer/src/main.ts`
- Create: `apps/customer/src/App.vue`
- Create: `apps/customer/src/router.ts`
- Create: `apps/customer/src/style.css`
- Create: `apps/customer/src/pages/Welcome.vue`

- [ ] **Step 1: 写 `apps/customer/package.json`**

```json
{
  "name": "customer",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.0",
    "vue-router": "^4.4.0",
    "pinia": "^2.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.0",
    "vue-tsc": "^2.1.0",
    "vite": "^5.4.0",
    "typescript": "^5.5.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

- [ ] **Step 2: 安装**

```bash
cd /home/ubuntu/qsy/commentsys
pnpm install
```

- [ ] **Step 3: 写 `apps/customer/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
```

- [ ] **Step 4: 写 `apps/customer/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["vite/client"],
    "isolatedModules": true,
    "useDefineForClassFields": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 5: 写 Tailwind 配置**

`apps/customer/tailwind.config.js`:
```javascript
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: { extend: {} },
  plugins: [],
};
```

`apps/customer/postcss.config.js`:
```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

`apps/customer/src/style.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #app { height: 100%; margin: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }
```

- [ ] **Step 6: 写 `apps/customer/index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>评价</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 7: 写 `apps/customer/src/main.ts`**

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router.js';
import './style.css';

createApp(App).use(createPinia()).use(router).mount('#app');
```

- [ ] **Step 8: 写 `apps/customer/src/App.vue`**

```vue
<script setup lang="ts"></script>

<template>
  <main class="min-h-full bg-gray-50">
    <RouterView />
  </main>
</template>
```

- [ ] **Step 9: 写 `apps/customer/src/router.ts`**

```typescript
import { createRouter, createWebHashHistory } from 'vue-router';
import Welcome from './pages/Welcome.vue';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Welcome },
  ],
});
```

- [ ] **Step 10: 写占位 `apps/customer/src/pages/Welcome.vue`**

```vue
<script setup lang="ts"></script>

<template>
  <div class="p-6 text-center">
    <h1 class="text-2xl font-bold mb-4">扫码写评价</h1>
    <p class="text-gray-600">骨架运行中</p>
  </div>
</template>
```

- [ ] **Step 11: 启动验证**

```bash
cd /home/ubuntu/qsy/commentsys
pnpm dev:customer
```

浏览器打开 `http://localhost:5173`,看到「扫码写评价 / 骨架运行中」即成功。

- [ ] **Step 12: 提交**

```bash
git add apps/customer
git commit -m "feat(customer): bootstrap Vue 3 + Vite + Tailwind skeleton"
```

---

### Task 0.5: 后台 H5 骨架(对照 0.4 复刻)

**Files:**
- Create: `apps/admin/package.json` (端口 5174,标题改 "店主后台")
- Create: `apps/admin/vite.config.ts`
- Create: `apps/admin/tsconfig.json`
- Create: `apps/admin/tailwind.config.js`
- Create: `apps/admin/postcss.config.js`
- Create: `apps/admin/index.html`
- Create: `apps/admin/src/main.ts`
- Create: `apps/admin/src/App.vue`
- Create: `apps/admin/src/router.ts`
- Create: `apps/admin/src/style.css`
- Create: `apps/admin/src/pages/Login.vue`

- [ ] **Step 1: 复制 Task 0.4 全部文件到 `apps/admin/`,修改:**
  - `package.json` 里 `name` → `"admin"`,`dev` 端口 → `5174`
  - `index.html` 标题 → `店主后台`
  - `router.ts` 用 `createWebHistory()` 替代 hash 路由(后台不在微信内打开,不受限制),路由 `/` → `Login`
  - `pages/Welcome.vue` → `pages/Login.vue`,正文改 "店主后台 / 骨架运行中"

`apps/admin/src/router.ts`:
```typescript
import { createRouter, createWebHistory } from 'vue-router';
import Login from './pages/Login.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Login },
  ],
});
```

- [ ] **Step 2: 安装**

```bash
cd /home/ubuntu/qsy/commentsys
pnpm install
```

- [ ] **Step 3: 启动验证**

```bash
pnpm dev:admin
```

浏览器 `http://localhost:5174`,看到 "店主后台 / 骨架运行中"。

- [ ] **Step 4: 提交**

```bash
git add apps/admin
git commit -m "feat(admin): bootstrap admin H5 skeleton"
```

---

### Task 0.6: 共享 API 类型定义模块

**Files:**
- Create: `apps/customer/src/api.ts`
- Create: `apps/admin/src/api.ts`

> 不抽公共包(YAGNI),两端各自维护一份 client。前后端类型通过 JSON 通讯,共享类型只在文档里约束。

- [ ] **Step 1: 写 `apps/customer/src/api.ts`**

```typescript
const BASE = '/api';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  startSession: (storeId: string) =>
    http<{ sessionId: string }>('/customer/sessions', {
      method: 'POST',
      body: JSON.stringify({ storeId, isWeChat: /MicroMessenger/i.test(navigator.userAgent) }),
    }),
};
```

- [ ] **Step 2: 写 `apps/admin/src/api.ts`** (初始只有占位 ping)

```typescript
const BASE = '/api/admin';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  ping: () => http<{ ok: true }>('/ping'),
};
```

- [ ] **Step 3: 提交**

```bash
git add apps
git commit -m "feat: add minimal API clients for customer and admin"
```

---

## Phase 1: 顾客端最小闭环(无 AI)

目标:扫码 → 打分 → 分流 → 提交 全流程跑通,文案先写死(下个 phase 接 AI),不接 OSS(图片用本地占位)。

### Task 1.1: 后端 - 创建 session 接口

**Files:**
- Create: `server/src/routes/customer.ts`
- Modify: `server/src/index.ts`
- Create: `server/tests/routes/customer.session.test.ts`

- [ ] **Step 1: 写测试**

`server/tests/routes/customer.session.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildCustomerRouter } from '../../src/routes/customer.js';

describe('POST /customer/sessions', () => {
  let app: ReturnType<typeof buildCustomerRouter>;
  beforeEach(() => {
    const db = openDb(':memory:');
    runMigrations(db);
    app = buildCustomerRouter(db);
  });

  it('creates a session and returns id', async () => {
    const res = await app.request('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: 'store1', isWeChat: true }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toMatch(/^[a-z0-9-]+$/);
  });

  it('400 when storeId missing', async () => {
    const res = await app.request('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

```bash
cd /home/ubuntu/qsy/commentsys/server && pnpm test
```

Expected: FAIL — `buildCustomerRouter` not defined

- [ ] **Step 3: 写实现 `server/src/routes/customer.ts`**

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { DB } from '../db.js';

const startSessionSchema = z.object({
  storeId: z.string().min(1),
  isWeChat: z.boolean().optional(),
});

export function buildCustomerRouter(db: DB) {
  const app = new Hono();

  app.post('/sessions', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = startSessionSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

    const id = randomUUID();
    const ua = c.req.header('user-agent') ?? '';
    db.prepare(
      `INSERT INTO sessions (id, store_id, user_agent, is_wechat, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(id, parsed.data.storeId, ua, parsed.data.isWeChat ? 1 : 0, Date.now());

    return c.json({ sessionId: id });
  });

  return app;
}
```

- [ ] **Step 4: 挂到主 app — 改 `server/src/index.ts`**

```typescript
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from './env.js';
import { getDb } from './db.js';
import { buildCustomerRouter } from './routes/customer.js';

mkdirSync(dirname(env.DB_PATH), { recursive: true });
const db = getDb();

const app = new Hono();
app.get('/health', (c) => c.json({ ok: true }));
app.route('/api/customer', buildCustomerRouter(db));

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server listening on http://localhost:${info.port}`);
});
```

- [ ] **Step 5: 跑测试验证通过**

```bash
pnpm test
```

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add server
git commit -m "feat(server): POST /api/customer/sessions"
```

---

### Task 1.2: 后端 - 提交打分接口

**Files:**
- Modify: `server/src/routes/customer.ts`
- Create: `server/tests/routes/customer.rating.test.ts`

- [ ] **Step 1: 写测试**

`server/tests/routes/customer.rating.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildCustomerRouter } from '../../src/routes/customer.js';

describe('POST /customer/sessions/:id/rating', () => {
  let app: ReturnType<typeof buildCustomerRouter>;
  let db: ReturnType<typeof openDb>;
  let sessionId: string;

  beforeEach(async () => {
    db = openDb(':memory:');
    runMigrations(db);
    app = buildCustomerRouter(db);
    const res = await app.request('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: 'store1' }),
    });
    sessionId = (await res.json()).sessionId;
  });

  it('stores rating and returns route hint', async () => {
    const res = await app.request(`/sessions/${sessionId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.route).toBe('positive');

    const row = db.prepare('SELECT rating FROM sessions WHERE id=?').get(sessionId) as any;
    expect(row.rating).toBe(5);
  });

  it('routes 1-3 stars to complaint', async () => {
    const res = await app.request(`/sessions/${sessionId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 2 }),
    });
    const body = await res.json();
    expect(body.route).toBe('complaint');
  });

  it('rejects invalid rating', async () => {
    const res = await app.request(`/sessions/${sessionId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 0 }),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

- [ ] **Step 3: 实现 — 在 `server/src/routes/customer.ts` 内追加 handler**

```typescript
const ratingSchema = z.object({ rating: z.number().int().min(1).max(5) });

// 在 buildCustomerRouter 内, sessions POST 之后追加:
app.post('/sessions/:id/rating', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = ratingSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

  const exists = db.prepare('SELECT 1 FROM sessions WHERE id=?').get(id);
  if (!exists) return c.json({ error: 'session_not_found' }, 404);

  db.prepare('UPDATE sessions SET rating=?, updated_at=? WHERE id=?').run(
    parsed.data.rating, Date.now(), id,
  );

  return c.json({
    route: parsed.data.rating >= 4 ? 'positive' : 'complaint',
  });
});
```

- [ ] **Step 4: 跑测试验证通过**

- [ ] **Step 5: 提交**

```bash
git add server
git commit -m "feat(server): rating endpoint with positive/complaint routing"
```

---

### Task 1.3: 后端 - 提交差评接口

**Files:**
- Modify: `server/src/routes/customer.ts`
- Create: `server/tests/routes/customer.complaint.test.ts`

- [ ] **Step 1: 写测试**

`server/tests/routes/customer.complaint.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildCustomerRouter } from '../../src/routes/customer.js';

describe('POST /customer/complaints', () => {
  let app: ReturnType<typeof buildCustomerRouter>;
  let db: ReturnType<typeof openDb>;
  let sessionId: string;

  beforeEach(async () => {
    db = openDb(':memory:');
    runMigrations(db);
    app = buildCustomerRouter(db);
    const r = await app.request('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: 'store1' }),
    });
    sessionId = (await r.json()).sessionId;
    await app.request(`/sessions/${sessionId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 2 }),
    });
  });

  it('inserts a complaint row', async () => {
    const res = await app.request('/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        message: '技师按摩太轻',
        contact: '13800001111',
      }),
    });
    expect(res.status).toBe(200);
    const row = db.prepare(
      'SELECT message, rating, status FROM complaints WHERE session_id=?',
    ).get(sessionId) as any;
    expect(row.message).toBe('技师按摩太轻');
    expect(row.rating).toBe(2);
    expect(row.status).toBe('pending');
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

- [ ] **Step 3: 实现 — 在 `server/src/routes/customer.ts` 内追加**

```typescript
const complaintSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(1000),
  contact: z.string().max(50).optional(),
});

app.post('/complaints', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = complaintSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

  const session = db.prepare(
    'SELECT store_id, rating FROM sessions WHERE id=?',
  ).get(parsed.data.sessionId) as any;
  if (!session) return c.json({ error: 'session_not_found' }, 404);
  if (!session.rating || session.rating > 3) {
    return c.json({ error: 'rating_not_eligible' }, 400);
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO complaints (id, session_id, store_id, rating, message, contact, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
  ).run(
    id,
    parsed.data.sessionId,
    session.store_id,
    session.rating,
    parsed.data.message,
    parsed.data.contact ?? null,
    Date.now(),
  );

  return c.json({ complaintId: id });
});
```

- [ ] **Step 4: 跑测试验证通过**

- [ ] **Step 5: 提交**

```bash
git add server
git commit -m "feat(server): complaint submission endpoint"
```

---

### Task 1.4: 顾客端 - 欢迎打分页

**Files:**
- Modify: `apps/customer/src/router.ts`
- Modify: `apps/customer/src/pages/Welcome.vue`
- Modify: `apps/customer/src/api.ts`
- Create: `apps/customer/src/components/StarRating.vue`
- Create: `apps/customer/src/store/session.ts`

> 测试策略:前端组件不写单元测试,通过 Phase 1 末尾的端到端 smoke 验证。

- [ ] **Step 1: 写 `apps/customer/src/components/StarRating.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ size?: number }>();
const emit = defineEmits<{ (e: 'change', rating: number): void }>();
const hover = ref(0);
const selected = ref(0);

function pick(n: number) {
  selected.value = n;
  emit('change', n);
}
</script>

<template>
  <div class="flex justify-center gap-2 select-none">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      @click="pick(n)"
      @mouseenter="hover = n"
      @mouseleave="hover = 0"
      class="text-5xl transition-transform active:scale-95"
      :class="(hover || selected) >= n ? 'text-yellow-400' : 'text-gray-300'"
      :aria-label="`${n} 星`"
    >
      ★
    </button>
  </div>
</template>
```

- [ ] **Step 2: 写 `apps/customer/src/store/session.ts`**

```typescript
import { defineStore } from 'pinia';

export const useSessionStore = defineStore('session', {
  state: () => ({
    sessionId: '' as string,
    storeId: '' as string,
    rating: 0,
  }),
});
```

- [ ] **Step 3: 扩展 `apps/customer/src/api.ts`**

```typescript
const BASE = '/api/customer';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  startSession: (storeId: string) =>
    http<{ sessionId: string }>('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        storeId,
        isWeChat: /MicroMessenger/i.test(navigator.userAgent),
      }),
    }),

  submitRating: (sessionId: string, rating: number) =>
    http<{ route: 'positive' | 'complaint' }>(`/sessions/${sessionId}/rating`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    }),

  submitComplaint: (sessionId: string, message: string, contact?: string) =>
    http<{ complaintId: string }>('/complaints', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message, contact }),
    }),
};
```

- [ ] **Step 4: 重写 `apps/customer/src/pages/Welcome.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import StarRating from '../components/StarRating.vue';
import { api } from '../api.js';
import { useSessionStore } from '../store/session.js';

const router = useRouter();
const route = useRoute();
const session = useSessionStore();
const loading = ref(false);
const error = ref('');

onMounted(async () => {
  const storeId = (route.query.s as string) || 'default-store';
  session.storeId = storeId;
  try {
    const { sessionId } = await api.startSession(storeId);
    session.sessionId = sessionId;
  } catch (e: any) {
    error.value = '网络异常,请刷新重试';
  }
});

async function onRate(rating: number) {
  if (!session.sessionId || loading.value) return;
  loading.value = true;
  try {
    session.rating = rating;
    const { route: next } = await api.submitRating(session.sessionId, rating);
    router.push(next === 'positive' ? '/positive' : '/complaint');
  } catch (e: any) {
    error.value = '提交失败,请重试';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col items-center px-6 pt-16">
    <h1 class="text-2xl font-bold mb-2">感谢您今天的光临</h1>
    <p class="text-gray-600 mb-12">请为本次服务打个分</p>
    <StarRating @change="onRate" />
    <p v-if="error" class="text-red-500 mt-6">{{ error }}</p>
    <p v-if="loading" class="text-gray-500 mt-6">提交中...</p>
  </div>
</template>
```

- [ ] **Step 5: 更新 `apps/customer/src/router.ts`**

```typescript
import { createRouter, createWebHashHistory } from 'vue-router';
import Welcome from './pages/Welcome.vue';
import PositiveReview from './pages/PositiveReview.vue';
import Complaint from './pages/Complaint.vue';
import ThankYou from './pages/ThankYou.vue';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Welcome },
    { path: '/positive', component: PositiveReview },
    { path: '/complaint', component: Complaint },
    { path: '/thanks', component: ThankYou },
  ],
});
```

- [ ] **Step 6: 提交**

```bash
git add apps/customer
git commit -m "feat(customer): welcome page with star rating"
```

> 注意: 1.4 提交后还不能 `pnpm dev:customer` 跑,因为 router 引用了未创建的 PositiveReview/Complaint/ThankYou。下个 task 补齐。

---

### Task 1.5: 顾客端 - 占位的好评页 / 差评页 / 感谢页

**Files:**
- Create: `apps/customer/src/pages/PositiveReview.vue`
- Create: `apps/customer/src/pages/Complaint.vue`
- Create: `apps/customer/src/pages/ThankYou.vue`

- [ ] **Step 1: 写 `apps/customer/src/pages/PositiveReview.vue`(Phase 1 占位)**

```vue
<script setup lang="ts">
import { useSessionStore } from '../store/session.js';

const session = useSessionStore();

const stubText = '今天来这家店做了头皮检测,小王手法专业,头皮感觉舒服多了。环境也不错,推荐脱发困扰的朋友试试。';

async function copyAndJump(platform: string) {
  try {
    await navigator.clipboard.writeText(stubText);
    alert(`已复制评价!请打开${platform} App 长按粘贴`);
  } catch {
    alert('请手动复制评价内容');
  }
}
</script>

<template>
  <div class="p-6">
    <h2 class="text-xl font-bold mb-4">公域评价页(占位)</h2>
    <p class="text-sm text-gray-600 mb-4">星级:{{ session.rating }}</p>
    <div class="bg-white rounded p-4 mb-4 border border-gray-200">{{ stubText }}</div>
    <div class="grid grid-cols-2 gap-3">
      <button @click="copyAndJump('点评')" class="bg-orange-500 text-white py-3 rounded">复制并打开点评</button>
      <button @click="copyAndJump('美团')" class="bg-yellow-500 text-white py-3 rounded">复制并打开美团</button>
      <button @click="copyAndJump('抖音')" class="bg-black text-white py-3 rounded">复制并打开抖音</button>
      <button @click="copyAndJump('小红书')" class="bg-red-500 text-white py-3 rounded">复制并打开小红书</button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 写 `apps/customer/src/pages/Complaint.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import { useSessionStore } from '../store/session.js';

const router = useRouter();
const session = useSessionStore();
const message = ref('');
const contact = ref('');
const loading = ref(false);
const error = ref('');

async function submit() {
  if (!message.value.trim()) { error.value = '请填写问题描述'; return; }
  if (!session.sessionId) { error.value = '会话失效,请重新扫码'; return; }
  loading.value = true;
  try {
    await api.submitComplaint(session.sessionId, message.value.trim(), contact.value || undefined);
    router.push('/thanks?type=complaint');
  } catch (e: any) {
    error.value = '提交失败,请重试';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="p-6">
    <h2 class="text-xl font-bold mb-2">非常抱歉今天没让您满意</h2>
    <p class="text-gray-600 mb-6 text-sm">请告诉我们哪里出了问题,店长 5 分钟内联系您处理。</p>

    <label class="block mb-3">
      <span class="text-sm text-gray-700">问题描述</span>
      <textarea v-model="message" rows="5"
        class="mt-1 w-full border border-gray-300 rounded p-2"
        placeholder="例如:技师按摩力度太轻..."/>
    </label>

    <label class="block mb-6">
      <span class="text-sm text-gray-700">联系方式(可选)</span>
      <input v-model="contact" type="tel" maxlength="11"
        class="mt-1 w-full border border-gray-300 rounded p-2"
        placeholder="手机号"/>
    </label>

    <button @click="submit" :disabled="loading"
      class="w-full bg-blue-500 disabled:bg-gray-300 text-white py-3 rounded">
      {{ loading ? '提交中...' : '提交反馈' }}
    </button>
    <p v-if="error" class="text-red-500 mt-3">{{ error }}</p>
  </div>
</template>
```

- [ ] **Step 3: 写 `apps/customer/src/pages/ThankYou.vue`**

```vue
<script setup lang="ts">
import { useRoute } from 'vue-router';
const route = useRoute();
const isComplaint = route.query.type === 'complaint';
</script>

<template>
  <div class="flex flex-col items-center text-center px-6 pt-24">
    <div class="text-5xl mb-6">{{ isComplaint ? '🙏' : '✨' }}</div>
    <h2 class="text-xl font-bold mb-2">
      {{ isComplaint ? '店长已收到您的反馈' : '感谢您的支持!' }}
    </h2>
    <p class="text-gray-600">
      {{ isComplaint ? '稍后会主动联系您处理,请保持电话通畅' : '期待下次为您服务' }}
    </p>
  </div>
</template>
```

- [ ] **Step 4: 端到端验证**

启动后端 + 前端:
```bash
# 终端1
pnpm dev:server
# 终端2
cd /home/ubuntu/qsy/commentsys && pnpm dev:customer
```

浏览器测试:
1. 打开 `http://localhost:5173/#/?s=store1` — 看到欢迎页 + 星星
2. 点 5 星 — 跳到公域评价页,4 个平台按钮
3. 浏览器后退,刷新,点 2 星 — 跳到差评页
4. 填问题 + 手机号,点提交 — 跳到感谢页

后端数据库验证:
```bash
sqlite3 /home/ubuntu/qsy/commentsys/server/data/commentsys.db
> SELECT id, rating FROM sessions;
> SELECT message, contact FROM complaints;
> .quit
```

- [ ] **Step 5: 提交**

```bash
git add apps/customer
git commit -m "feat(customer): complete MVP flow (no AI, stubbed copy)"
```

---

### Task 1.6: 后端 - 评价生成接口(stub 版本,Phase 2 接 AI)

**Files:**
- Modify: `server/src/routes/customer.ts`
- Create: `server/tests/routes/customer.review.test.ts`

> 先让接口存在并返回 hardcoded 文案,Phase 2 替换为真 LLM。这样前端 Phase 1 末就能联调,不卡 Phase 2。

- [ ] **Step 1: 写测试**

`server/tests/routes/customer.review.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildCustomerRouter } from '../../src/routes/customer.js';

describe('POST /customer/reviews/generate', () => {
  let app: ReturnType<typeof buildCustomerRouter>;
  let sessionId: string;

  beforeEach(async () => {
    const db = openDb(':memory:');
    runMigrations(db);
    app = buildCustomerRouter(db);
    const r = await app.request('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: 'store1' }),
    });
    sessionId = (await r.json()).sessionId;
    await app.request(`/sessions/${sessionId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5 }),
    });
  });

  it('returns a non-empty review text', async () => {
    const res = await app.request('/reviews/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        platform: 'dianping',
        tags: ['头皮检测'],
        technician: '小王',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text.length).toBeGreaterThan(20);
    expect(body.source).toBe('stub');
  });

  it('400 on unknown platform', async () => {
    const res = await app.request('/reviews/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, platform: 'twitter', tags: [], technician: '' }),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

- [ ] **Step 3: 实现 — 在 `server/src/routes/customer.ts` 内追加**

```typescript
const PLATFORMS = ['dianping', 'meituan', 'douyin', 'xiaohongshu'] as const;
const generateSchema = z.object({
  sessionId: z.string().uuid(),
  platform: z.enum(PLATFORMS),
  tags: z.array(z.string()).default([]),
  technician: z.string().default(''),
});

app.post('/reviews/generate', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

  const stubByPlatform: Record<string, string> = {
    dianping: `今天来这家店做了${parsed.data.tags[0] ?? '头皮检测'}，${parsed.data.technician || '技师'}手法专业，头皮明显感觉清爽很多。环境也不错，整体性价比高，推荐脱发困扰的朋友试试。`,
    meituan: `做了一次${parsed.data.tags[0] ?? '头皮检测'}，效果不错，技师专业，会再来。`,
    douyin: `头皮养护打卡！${parsed.data.tags[0] ?? '头皮检测'}做完整个人都轻松了，建议姐妹们试一次。`,
    xiaohongshu: `姐妹们我又来分享啦~ ${parsed.data.tags[0] ?? '头皮检测'}体验感超棒，技师手法细致，头皮真的轻松了好多！价格也合理🤍`,
  };

  return c.json({
    text: stubByPlatform[parsed.data.platform],
    source: 'stub',
  });
});
```

- [ ] **Step 4: 跑测试验证通过**

- [ ] **Step 5: 提交**

```bash
git add server
git commit -m "feat(server): stub review generation endpoint (AI later)"
```

---

### Task 1.7: 顾客端 - 用真接口替换好评页占位文案

**Files:**
- Modify: `apps/customer/src/api.ts`
- Modify: `apps/customer/src/pages/PositiveReview.vue`

- [ ] **Step 1: 扩展 `apps/customer/src/api.ts`**

```typescript
// 追加在 api 对象内:
generateReview: (sessionId: string, platform: string, tags: string[], technician: string) =>
  http<{ text: string; source: 'ai' | 'template' | 'stub' }>('/reviews/generate', {
    method: 'POST',
    body: JSON.stringify({ sessionId, platform, tags, technician }),
  }),
```

- [ ] **Step 2: 重写 `apps/customer/src/pages/PositiveReview.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api.js';
import { useSessionStore } from '../store/session.js';

const session = useSessionStore();
const platform = ref<'dianping' | 'meituan' | 'douyin' | 'xiaohongshu'>('dianping');
const tags = ref<string[]>([]);
const technician = ref('');
const text = ref('');
const loading = ref(false);

const PLATFORM_LABEL: Record<string, string> = {
  dianping: '大众点评', meituan: '美团',
  douyin: '抖音', xiaohongshu: '小红书',
};
const AVAILABLE_TAGS = ['头皮检测', '头皮排毒', '防脱护理', '中药养发', '头皮 SPA', '育发疗程'];
const TECHNICIANS = ['小王', '小李', '小张'];

async function regenerate() {
  if (!session.sessionId) return;
  loading.value = true;
  try {
    const { text: t } = await api.generateReview(
      session.sessionId, platform.value, tags.value, technician.value,
    );
    text.value = t;
  } finally { loading.value = false; }
}

function toggleTag(tag: string) {
  const i = tags.value.indexOf(tag);
  if (i >= 0) tags.value.splice(i, 1); else tags.value.push(tag);
}

async function copyAndJump() {
  try {
    await navigator.clipboard.writeText(text.value);
    alert(`已复制评价!请打开 ${PLATFORM_LABEL[platform.value]} App 长按粘贴`);
  } catch {
    alert('请手动复制评价内容');
  }
}

onMounted(regenerate);
</script>

<template>
  <div class="p-4 space-y-4">
    <h2 class="text-lg font-bold">写一条好评</h2>

    <div>
      <div class="text-sm text-gray-600 mb-2">发到哪个平台?</div>
      <div class="grid grid-cols-4 gap-2">
        <button v-for="(label, key) in PLATFORM_LABEL" :key="key"
          @click="platform = (key as any); regenerate()"
          class="py-2 rounded border text-sm"
          :class="platform === key ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300'">
          {{ label }}
        </button>
      </div>
    </div>

    <div>
      <div class="text-sm text-gray-600 mb-2">今天体验了什么?</div>
      <div class="flex flex-wrap gap-2">
        <button v-for="t in AVAILABLE_TAGS" :key="t" @click="toggleTag(t)"
          class="px-3 py-1 rounded-full border text-sm"
          :class="tags.includes(t) ? 'bg-green-100 border-green-500' : 'border-gray-300'">
          {{ t }}
        </button>
      </div>
    </div>

    <div>
      <div class="text-sm text-gray-600 mb-2">服务技师</div>
      <div class="flex gap-2">
        <button v-for="t in TECHNICIANS" :key="t" @click="technician = t"
          class="px-3 py-1 rounded-full border text-sm"
          :class="technician === t ? 'bg-green-100 border-green-500' : 'border-gray-300'">
          {{ t }}
        </button>
      </div>
    </div>

    <div class="bg-white border border-gray-200 rounded p-3">
      <div v-if="loading" class="text-gray-500 text-sm">AI 正在为您写评价...</div>
      <textarea v-else v-model="text" rows="6"
        class="w-full text-sm focus:outline-none resize-none"/>
      <div class="flex justify-end mt-2 gap-2">
        <button @click="regenerate" :disabled="loading"
          class="text-sm text-blue-500 disabled:text-gray-300">换一条</button>
      </div>
    </div>

    <button @click="copyAndJump" :disabled="!text"
      class="w-full bg-orange-500 disabled:bg-gray-300 text-white py-3 rounded">
      复制评价 + 打开 {{ PLATFORM_LABEL[platform] }}
    </button>
  </div>
</template>
```

- [ ] **Step 3: 端到端验证**

刷新 `http://localhost:5173/#/?s=store1` → 5 星 → 看到选平台/标签/技师页,默认点评,文案自动出现;切换平台,文案变;切换标签后点"换一条",文案变。

- [ ] **Step 4: 提交**

```bash
git add apps/customer
git commit -m "feat(customer): wire positive review page to API"
```

---


## Phase 2: AI 文案生成 + 模板池兜底

目标:把 Phase 1 的 stub 文案替换成 DeepSeek 真生成,失败时自动回退到模板变量池。

### Task 2.1: LLM 服务 - DeepSeek 客户端

**Files:**
- Create: `server/src/services/llm.ts`
- Create: `server/tests/services/llm.test.ts`

- [ ] **Step 1: 写测试 `server/tests/services/llm.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateReview, type GenerateInput } from '../../src/services/llm.js';

describe('generateReview', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('calls DeepSeek with system prompt and returns text', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        choices: [{ message: { content: '今天来这家店做了头皮检测，效果很好。' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    const input: GenerateInput = {
      platform: 'dianping',
      rating: 5, tags: ['头皮检测'], technician: '小王',
    };
    const out = await generateReview(input, 'fake-key');

    expect(out.text).toContain('头皮');
    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0];
    const body = JSON.parse(call[1]!.body as string);
    expect(body.model).toBeDefined();
    expect(body.messages[0].role).toBe('system');
  });

  it('throws on non-2xx', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('rate limited', { status: 429 }),
    );
    await expect(
      generateReview({ platform: 'dianping', rating: 5, tags: [], technician: '' }, 'k'),
    ).rejects.toThrow();
  });

  it('rejects empty completion', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    await expect(
      generateReview({ platform: 'dianping', rating: 5, tags: [], technician: '' }, 'k'),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

```bash
cd /home/ubuntu/qsy/commentsys/server && pnpm test
```

Expected: FAIL — `generateReview` not defined

- [ ] **Step 3: 写实现 `server/src/services/llm.ts`**

```typescript
import { buildPrompt } from '../prompts/index.js';

const ENDPOINT = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';

export type Platform = 'dianping' | 'meituan' | 'douyin' | 'xiaohongshu';

export interface GenerateInput {
  platform: Platform;
  rating: 4 | 5 | number;
  tags: string[];
  technician: string;
}

export interface GenerateOutput {
  text: string;
}

export async function generateReview(
  input: GenerateInput,
  apiKey: string,
  signal?: AbortSignal,
): Promise<GenerateOutput> {
  const { system, user } = buildPrompt(input);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 1.0,
      max_tokens: 600,
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('LLM returned empty content');
  return { text };
}
```

- [ ] **Step 4: 创建占位 prompts 模块 `server/src/prompts/index.ts`**

```typescript
import type { GenerateInput } from '../services/llm.js';
import { dianpingPrompt } from './dianping.js';
import { meituanPrompt } from './meituan.js';
import { douyinPrompt } from './douyin.js';
import { xiaohongshuPrompt } from './xiaohongshu.js';

const REGISTRY = {
  dianping: dianpingPrompt,
  meituan: meituanPrompt,
  douyin: douyinPrompt,
  xiaohongshu: xiaohongshuPrompt,
};

export function buildPrompt(input: GenerateInput): { system: string; user: string } {
  return REGISTRY[input.platform](input);
}
```

- [ ] **Step 5: 跑测试 — 还会因为 prompts 不存在 FAIL,下个任务补**

```bash
pnpm test
```

> 这里允许暂失败,在 Task 2.2 补完 prompts 后会全部通过。

- [ ] **Step 6: 提交(标注 WIP)**

```bash
git add server
git commit -m "feat(server): LLM client skeleton (DeepSeek)"
```

---

### Task 2.2: 4 平台 prompt 模板

**Files:**
- Create: `server/src/prompts/dianping.ts`
- Create: `server/src/prompts/meituan.ts`
- Create: `server/src/prompts/douyin.ts`
- Create: `server/src/prompts/xiaohongshu.ts`
- Create: `server/tests/prompts.test.ts`

- [ ] **Step 1: 写测试**

`server/tests/prompts.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../src/prompts/index.js';

const base = { rating: 5, tags: ['头皮检测', '防脱护理'], technician: '小王' };

describe('prompt builders', () => {
  it('dianping prompt mentions length and forbidden words', () => {
    const { system, user } = buildPrompt({ ...base, platform: 'dianping' });
    expect(system).toMatch(/200/);
    expect(system).toMatch(/避免|不要使用/);
    expect(user).toContain('小王');
    expect(user).toContain('头皮检测');
  });

  it('douyin prompt enforces shorter length', () => {
    const { system } = buildPrompt({ ...base, platform: 'douyin' });
    expect(system).toMatch(/150|80/);
  });

  it('xiaohongshu prompt allows emoji', () => {
    const { system } = buildPrompt({ ...base, platform: 'xiaohongshu' });
    expect(system).toMatch(/emoji/i);
  });

  it('meituan prompt mirrors dianping with own length', () => {
    const { system } = buildPrompt({ ...base, platform: 'meituan' });
    expect(system).toMatch(/180|250/);
  });

  it('inserts random variants for anti-dedup', () => {
    const a = buildPrompt({ ...base, platform: 'dianping' });
    const b = buildPrompt({ ...base, platform: 'dianping' });
    expect([a.user, b.user]).not.toEqual([a.user, a.user]);
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

- [ ] **Step 3: 写 `server/src/prompts/dianping.ts`**

```typescript
import type { GenerateInput } from '../services/llm.js';

const TIME_OF_DAY = ['上午', '下午', '晚上', '中午刚下班后'];
const AUDIENCE = ['脱发严重的人', '油性头皮的朋友', '产后掉发的姐妹', '中年男性'];
const FORBIDDEN = ['极致', '震撼', '完美', '惊艳', '神器', '超绝'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function dianpingPrompt(input: GenerateInput) {
  const sentenceVariant = Math.floor(Math.random() * 10) + 1;

  const system = `你是一位刚做完头皮养发服务的真实顾客，正在大众点评写一条好评。

要求：
- 字数严格在 200-300 字之间
- 流水账风格，自然真实，不要分段，一段话写完
- 评分 ${input.rating} 星，必须是正面评价
- 句式参考编号 ${sentenceVariant}，句子长短交错
- 不要使用 emoji
- 严格避免出现以下任何词：${FORBIDDEN.join('、')}
- 不要使用"强烈推荐"等过于营销化的话术`;

  const user = `请写一条评价，包含以下要素：
- 项目：${input.tags.join('、') || '头皮养护'}
- 技师：${input.technician || '店里的技师'}
- 体验时段：${pick(TIME_OF_DAY)}
- 适合人群（在评价中自然带出）：${pick(AUDIENCE)}
- 可以提到一个小细节（例如等候时长、洗发水气味、按摩力度、店里的茶水等）

只输出评价正文，不要任何解释或前言。`;

  return { system, user };
}
```

- [ ] **Step 4: 写 `server/src/prompts/meituan.ts`**

```typescript
import type { GenerateInput } from '../services/llm.js';

const TIME = ['上午', '下午', '晚上'];
const FORBIDDEN = ['极致', '震撼', '完美', '惊艳', '神器'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function meituanPrompt(input: GenerateInput) {
  const v = Math.floor(Math.random() * 10) + 1;
  const system = `你是在美团 App 写评价的真实顾客。

要求：
- 字数 180-250 字
- 比大众点评稍口语化一些
- 评分 ${input.rating} 星
- 句式参考 ${v}
- 不要使用 emoji
- 避免词：${FORBIDDEN.join('、')}`;

  const user = `项目：${input.tags.join('、') || '头皮养护'}
技师：${input.technician || '技师'}
时段：${pick(TIME)}

只输出评价正文。`;

  return { system, user };
}
```

- [ ] **Step 5: 写 `server/src/prompts/douyin.ts`**

```typescript
import type { GenerateInput } from '../services/llm.js';

const HOOKS = ['头皮养护打卡', '记录今天的护理', '宝藏养发店分享', '终于来体验了'];
const FORBIDDEN = ['极致', '震撼', '完美', '神器'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function douyinPrompt(input: GenerateInput) {
  const v = Math.floor(Math.random() * 8) + 1;
  const system = `你正在抖音上给刚体验过的本地养发店写评价。

要求：
- 字数 80-150 字，短句为主
- 结果先行，第一句就说效果
- 评分 ${input.rating} 星
- 口语化，1-2 个 emoji 即可，不要刷屏
- 句式参考 ${v}
- 避免词：${FORBIDDEN.join('、')}`;

  const user = `开场参考：${pick(HOOKS)}
项目：${input.tags.join('、') || '头皮养护'}
技师：${input.technician || '技师'}

只输出评价正文。`;

  return { system, user };
}
```

- [ ] **Step 6: 写 `server/src/prompts/xiaohongshu.ts`**

```typescript
import type { GenerateInput } from '../services/llm.js';

const PAIN = ['脱发严重', '头皮出油', '头皮发痒', '发量稀少', '产后掉发'];
const FORBIDDEN = ['极致', '震撼', '完美', '神器'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function xiaohongshuPrompt(input: GenerateInput) {
  const v = Math.floor(Math.random() * 8) + 1;
  const system = `你正在小红书发一篇养发护理体验笔记。

要求：
- 字数 150-250 字
- 种草风格，可以分 2-3 个小段或用短换行
- 适量使用 emoji（3-6 个），常用 🤍✨🌿💆‍♀️
- 评分 ${input.rating} 星
- 句式参考 ${v}
- 避免词：${FORBIDDEN.join('、')}
- 适合开场："姐妹们"、"今天来分享一下"、"宝藏养发店"`;

  const user = `项目：${input.tags.join('、') || '头皮养护'}
技师：${input.technician || '技师'}
痛点共鸣：${pick(PAIN)}

只输出笔记正文。`;

  return { system, user };
}
```

- [ ] **Step 7: 跑全部测试**

```bash
pnpm test
```

Expected: 所有 LLM 和 prompts 测试 PASS

- [ ] **Step 8: 提交**

```bash
git add server
git commit -m "feat(server): four-platform prompt templates with variant injection"
```

---

### Task 2.3: 模板变量池兜底

**Files:**
- Create: `seed-data/templates/dianping.json`
- Create: `seed-data/templates/meituan.json`
- Create: `seed-data/templates/douyin.json`
- Create: `seed-data/templates/xiaohongshu.json`
- Create: `server/src/services/templatePool.ts`
- Create: `server/tests/services/templatePool.test.ts`

- [ ] **Step 1: 写测试**

`server/tests/services/templatePool.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { composeFromPool } from '../../src/services/templatePool.js';

describe('templatePool', () => {
  it('produces text in expected length range for dianping', () => {
    const t = composeFromPool({
      platform: 'dianping',
      rating: 5, tags: ['头皮检测'], technician: '小王',
    });
    expect(t.length).toBeGreaterThanOrEqual(80);
    expect(t.length).toBeLessThanOrEqual(400);
    expect(t).toContain('小王');
  });

  it('produces different content across calls', () => {
    const set = new Set<string>();
    for (let i = 0; i < 10; i++) {
      set.add(composeFromPool({
        platform: 'dianping', rating: 5,
        tags: ['头皮检测'], technician: '小王',
      }));
    }
    expect(set.size).toBeGreaterThan(3);
  });

  it('works for all 4 platforms', () => {
    for (const p of ['dianping', 'meituan', 'douyin', 'xiaohongshu'] as const) {
      const t = composeFromPool({ platform: p, rating: 5, tags: [], technician: '' });
      expect(t.length).toBeGreaterThan(20);
    }
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

- [ ] **Step 3: 写种子模板 `seed-data/templates/dianping.json`**

```json
{
  "platform": "dianping",
  "openings": [
    "今天路过这家店进来做了一次头疗",
    "朋友推荐过来的，听说这家的头皮检测很专业",
    "脱发困扰了我半年，在这家终于找到方向",
    "之前一直想找一家专业的养发店，今天体验下来很满意",
    "店里环境干净，前台接待也热情",
    "上次同事来过说不错，今天自己也来试了",
    "工作压力大头皮一直油，决定来好好做一次护理",
    "周末抽空给自己做了一次养发，感觉很值",
    "最近发现发量变少，朋友介绍来这家店",
    "进店后被店里的安静氛围吸引"
  ],
  "projects": [
    "做了一个完整的头皮检测项目",
    "体验了店里的头皮排毒套餐",
    "选了防脱护理项目",
    "做了中药养发疗程",
    "选了头皮 SPA 项目",
    "尝试了店里招牌的育发疗程"
  ],
  "technicianPraise": [
    "技师{name}手法很专业，按摩力度刚好",
    "{name}老师讲解得很细致，每一步都说明白",
    "{name}手法娴熟，过程中很放松",
    "服务的{name}非常有耐心，问得很细",
    "{name}做的过程一气呵成，没有多余动作",
    "技师{name}经验丰富，一上手就感觉到差别"
  ],
  "effects": [
    "做完头皮明显感觉清爽很多",
    "整个头部都很轻松，感觉血液循环都好了",
    "洗完头发蓬松度有提升",
    "头油的情况好像缓解了不少",
    "做完按摩整个人精神都好了",
    "头皮的紧绷感明显减轻"
  ],
  "prices": [
    "价格在可接受范围",
    "性价比觉得是合理的",
    "套餐的价格觉得物有所值",
    "和市面同类项目比不算贵",
    "为效果买单挺值得"
  ],
  "endings": [
    "下次还会再来，推荐有同样困扰的朋友试试",
    "已经办了卡，准备坚持做一个疗程",
    "整体体验不错，会带朋友一起来",
    "推荐脱发困扰的朋友可以来看看",
    "总之是个值得来的店，期待下次"
  ]
}
```

- [ ] **Step 4: 写 `seed-data/templates/meituan.json`**

```json
{
  "platform": "meituan",
  "openings": [
    "团购了一个头皮检测体验",
    "美团买的优惠券",
    "看了团购评分过来的",
    "在美团搜了下家附近的养发店",
    "周末用美团团购来体验",
    "美团上看到的活动",
    "周末闲着团购来试了试"
  ],
  "projects": [
    "做了头皮检测",
    "试了排毒护理",
    "体验防脱项目",
    "做了一次头皮 SPA",
    "做了基础养发"
  ],
  "technicianPraise": [
    "技师{name}态度很好",
    "{name}讲解专业",
    "{name}手法细致",
    "服务的{name}很有耐心",
    "{name}经验明显丰富"
  ],
  "effects": [
    "头皮很清爽",
    "头部很轻松",
    "做完感觉头皮很舒服",
    "效果可以"
  ],
  "prices": [
    "团购价很划算",
    "性价比不错",
    "比直接到店便宜不少"
  ],
  "endings": [
    "会再来",
    "推荐",
    "团购很值",
    "下次还选这家"
  ]
}
```

- [ ] **Step 5: 写 `seed-data/templates/douyin.json`**

```json
{
  "platform": "douyin",
  "openings": [
    "头皮养护打卡",
    "宝藏养发店分享",
    "终于来体验了",
    "记录今天的护理",
    "脱发星人来报到"
  ],
  "projects": [
    "做了头皮检测",
    "体验了排毒护理",
    "防脱项目走起",
    "中药养发疗程"
  ],
  "technicianPraise": [
    "技师{name}手法在线",
    "{name}超专业",
    "{name}很细致"
  ],
  "effects": [
    "头皮真的轻松了",
    "头油立刻缓解",
    "做完精神都不一样"
  ],
  "endings": [
    "已加入回头客名单",
    "下次还来",
    "推荐姐妹们试试",
    "性价比可以"
  ]
}
```

- [ ] **Step 6: 写 `seed-data/templates/xiaohongshu.json`**

```json
{
  "platform": "xiaohongshu",
  "openings": [
    "姐妹们我又来分享啦~",
    "今天来分享一家宝藏养发店",
    "脱发救星店打卡 🌿",
    "终于找到一家靠谱的头皮护理 ✨",
    "工作压力大头油严重的姐妹看过来"
  ],
  "projects": [
    "做了一次头皮检测",
    "试了排毒护理套餐",
    "体验了防脱项目",
    "中药养发疗程"
  ],
  "technicianPraise": [
    "技师{name}手法绝了 🤍",
    "{name}超有耐心",
    "{name}讲解很细致 ✨"
  ],
  "effects": [
    "头皮真的轻松好多",
    "做完整个人都精神了",
    "头油明显缓解 🌿",
    "蓬松度提升很多"
  ],
  "endings": [
    "已经办卡准备长期做",
    "推荐有同样困扰的姐妹试试 🤍",
    "下次还来",
    "性价比超棒"
  ]
}
```

- [ ] **Step 7: 写实现 `server/src/services/templatePool.ts`**

```typescript
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenerateInput } from './llm.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..', 'seed-data', 'templates');

interface Pool {
  openings: string[];
  projects: string[];
  technicianPraise: string[];
  effects: string[];
  prices?: string[];
  endings: string[];
}

const cache = new Map<string, Pool>();

function loadPool(platform: string): Pool {
  let pool = cache.get(platform);
  if (!pool) {
    const raw = readFileSync(join(ROOT, `${platform}.json`), 'utf-8');
    pool = JSON.parse(raw) as Pool;
    cache.set(platform, pool);
  }
  return pool;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function composeFromPool(input: GenerateInput): string {
  const pool = loadPool(input.platform);
  const technician = input.technician || '店里的技师';
  const tagSentence = input.tags.length
    ? `这次主要做的是${input.tags.join('和')}`
    : '';

  const parts: string[] = [];
  parts.push(pick(pool.openings));
  parts.push(pick(pool.projects));
  if (tagSentence) parts.push(tagSentence);
  parts.push(pick(pool.technicianPraise).replace('{name}', technician));
  parts.push(pick(pool.effects));
  if (pool.prices) parts.push(pick(pool.prices));
  parts.push(pick(pool.endings));

  const separator = input.platform === 'xiaohongshu' ? '\n' : '，';
  return parts.join(separator).replace(/，+/g, '，').replace(/^，|，$/g, '') + '。';
}
```

- [ ] **Step 8: 跑测试验证通过**

```bash
pnpm test
```

- [ ] **Step 9: 提交**

```bash
git add seed-data server
git commit -m "feat(server): template pool fallback with variable composition"
```

---

### Task 2.4: 把 stub 换成真生成

**Files:**
- Modify: `server/src/routes/customer.ts`
- Create: `server/tests/routes/customer.review.integration.test.ts`

- [ ] **Step 1: 写测试**

`server/tests/routes/customer.review.integration.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildCustomerRouter } from '../../src/routes/customer.js';

describe('review generation integration', () => {
  let app: ReturnType<typeof buildCustomerRouter>;
  let sessionId: string;

  beforeEach(async () => {
    process.env.DEEPSEEK_API_KEY = 'fake-key';
    const db = openDb(':memory:');
    runMigrations(db);
    app = buildCustomerRouter(db);
    const r = await app.request('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: 's' }),
    });
    sessionId = (await r.json()).sessionId;
    await app.request(`/sessions/${sessionId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5 }),
    });
  });

  it('returns AI text when LLM succeeds', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        choices: [{ message: { content: '今天来这家做了头皮检测，体验很好。' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    const res = await app.request('/reviews/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId, platform: 'dianping', tags: ['头皮检测'], technician: '小王',
      }),
    });

    const body = await res.json();
    expect(body.source).toBe('ai');
    expect(body.text).toContain('头皮');
  });

  it('falls back to template when LLM fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('boom'));

    const res = await app.request('/reviews/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId, platform: 'dianping', tags: ['头皮检测'], technician: '小王',
      }),
    });

    const body = await res.json();
    expect(body.source).toBe('template');
    expect(body.text.length).toBeGreaterThan(20);
  });

  it('falls back to template when API key missing', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const res = await app.request('/reviews/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId, platform: 'dianping', tags: [], technician: '',
      }),
    });
    const body = await res.json();
    expect(body.source).toBe('template');
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

- [ ] **Step 3: 改 `server/src/routes/customer.ts`,替换 `/reviews/generate`**

```typescript
import { generateReview } from '../services/llm.js';
import { composeFromPool } from '../services/templatePool.js';
import { env } from '../env.js';

// 替换原来的 stub 实现:
app.post('/reviews/generate', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

  const session = db.prepare('SELECT rating FROM sessions WHERE id=?').get(parsed.data.sessionId) as any;
  const rating = session?.rating ?? 5;

  const input = {
    platform: parsed.data.platform,
    rating,
    tags: parsed.data.tags,
    technician: parsed.data.technician,
  };

  // 1) 没配 API key,直接走模板
  if (!env.DEEPSEEK_API_KEY) {
    return c.json({ text: composeFromPool(input), source: 'template' });
  }

  // 2) 调 LLM,失败兜底
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const out = await generateReview(input, env.DEEPSEEK_API_KEY, controller.signal);
    clearTimeout(timer);
    return c.json({ text: out.text, source: 'ai' });
  } catch (err) {
    console.error('LLM failed, falling back to template:', err);
    return c.json({ text: composeFromPool(input), source: 'template' });
  }
});
```

- [ ] **Step 4: 跑测试验证通过**

```bash
pnpm test
```

- [ ] **Step 5: 联调(手动)— 给 `.env` 填 DEEPSEEK_API_KEY 后实测**

```bash
echo 'DEEPSEEK_API_KEY=your_real_key' >> server/.env
pnpm dev:server
```

新终端:
```bash
# 先建 session
SID=$(curl -s -X POST http://localhost:8787/api/customer/sessions \
  -H 'Content-Type: application/json' \
  -d '{"storeId":"s1"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['sessionId'])")

# 打分
curl -X POST http://localhost:8787/api/customer/sessions/$SID/rating \
  -H 'Content-Type: application/json' \
  -d '{"rating":5}'

# 生成
curl -X POST http://localhost:8787/api/customer/reviews/generate \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"'$SID'","platform":"dianping","tags":["头皮检测"],"technician":"小王"}'
```

Expected: `{"text":"...真实 AI 生成的评价...","source":"ai"}`

- [ ] **Step 6: 提交**

```bash
git add server
git commit -m "feat(server): real LLM generation with template fallback"
```

---

### Task 2.5: 顾客端 - 显示生成来源标识

**Files:**
- Modify: `apps/customer/src/pages/PositiveReview.vue`

- [ ] **Step 1: 在 PositiveReview.vue 中,把生成结果的 source 暂存并展示在调试角(灰色小字)**

替换 `regenerate` 函数和模板中的文案区:

```vue
<script setup lang="ts">
// 已有 imports...
const source = ref<'ai' | 'template' | 'stub' | ''>('');

async function regenerate() {
  if (!session.sessionId) return;
  loading.value = true;
  try {
    const out = await api.generateReview(
      session.sessionId, platform.value, tags.value, technician.value,
    );
    text.value = out.text;
    source.value = out.source;
  } finally { loading.value = false; }
}
</script>
```

文案框下面加一行(顾客可见,文字小灰色,无副作用):
```vue
<div class="text-xs text-gray-400 text-right mt-1">
  <span v-if="source === 'ai'">✨ AI 生成</span>
  <span v-else-if="source === 'template'">📝 模板生成</span>
</div>
```

- [ ] **Step 2: 提交**

```bash
git add apps/customer
git commit -m "feat(customer): show generation source indicator"
```

---


## Phase 3: 后台与鉴权

目标:店主和店长可以用手机号 + 短信验证码登录,看数据看板,处理差评。

### Task 3.1: 短信服务(支持 mock 模式)

**Files:**
- Create: `server/src/services/sms.ts`
- Create: `server/tests/services/sms.test.ts`

> 开发期短信验证码直接打日志(不真发),生产期接阿里云。

- [ ] **Step 1: 写测试 `server/tests/services/sms.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendVerificationCode } from '../../src/services/sms.js';

describe('sms', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('logs code when no API key configured', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ok = await sendVerificationCode('13800001111', '123456', {});
    expect(ok).toBe(true);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('123456'));
  });

  it('calls Aliyun API when configured', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ Code: 'OK' }), { status: 200 }),
    );
    const ok = await sendVerificationCode('13800001111', '888888', {
      ALIYUN_SMS_ACCESS_KEY: 'k', ALIYUN_SMS_SECRET: 's', ALIYUN_SMS_SIGN: 'sign',
    });
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

- [ ] **Step 3: 写 `server/src/services/sms.ts`**

```typescript
interface SmsConfig {
  ALIYUN_SMS_ACCESS_KEY?: string;
  ALIYUN_SMS_SECRET?: string;
  ALIYUN_SMS_SIGN?: string;
}

const TEMPLATE_CODE = 'SMS_DEFAULT_VERIFY';

export async function sendVerificationCode(
  phone: string,
  code: string,
  config: SmsConfig,
): Promise<boolean> {
  if (!config.ALIYUN_SMS_ACCESS_KEY || !config.ALIYUN_SMS_SECRET) {
    console.log(`[SMS-DEV] To ${phone}: verification code ${code}`);
    return true;
  }

  const params = new URLSearchParams({
    Action: 'SendSms',
    PhoneNumbers: phone,
    SignName: config.ALIYUN_SMS_SIGN ?? '',
    TemplateCode: TEMPLATE_CODE,
    TemplateParam: JSON.stringify({ code }),
  });

  const res = await fetch(`https://dysmsapi.aliyuncs.com/?${params}`, {
    method: 'POST',
    headers: {
      'Authorization': `acs ${config.ALIYUN_SMS_ACCESS_KEY}:${config.ALIYUN_SMS_SECRET}`,
    },
  });
  return res.ok;
}
```

> 阿里云 V3 签名实际更复杂(HMAC-SHA1 + 多个 query 参数),本文档为简化版。生产实施需接阿里云 SDK,但接口形态相同。

- [ ] **Step 4: 跑测试验证通过**

- [ ] **Step 5: 提交**

```bash
git add server
git commit -m "feat(server): SMS service with dev-mode logging"
```

---

### Task 3.2: 鉴权服务(JWT)

**Files:**
- Create: `server/src/services/auth.ts`
- Create: `server/tests/services/auth.test.ts`

- [ ] **Step 1: 添加 JWT 依赖**

```bash
cd /home/ubuntu/qsy/commentsys/server
pnpm add jose
```

- [ ] **Step 2: 写测试**

```typescript
import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '../../src/services/auth.js';

describe('auth tokens', () => {
  it('signs and verifies a token', async () => {
    const t = await signToken({ operatorId: 'op1', storeId: 's1' }, 'secret123');
    const claims = await verifyToken(t, 'secret123');
    expect(claims.operatorId).toBe('op1');
    expect(claims.storeId).toBe('s1');
  });

  it('rejects wrong secret', async () => {
    const t = await signToken({ operatorId: 'op1', storeId: 's1' }, 'secret123');
    await expect(verifyToken(t, 'wrong')).rejects.toThrow();
  });
});
```

- [ ] **Step 3: 写实现 `server/src/services/auth.ts`**

```typescript
import { SignJWT, jwtVerify } from 'jose';

export interface TokenClaims {
  operatorId: string;
  storeId: string;
}

function secretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signToken(claims: TokenClaims, secret: string): Promise<string> {
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey(secret));
}

export async function verifyToken(token: string, secret: string): Promise<TokenClaims> {
  const { payload } = await jwtVerify(token, secretKey(secret));
  return {
    operatorId: String(payload.operatorId),
    storeId: String(payload.storeId),
  };
}
```

- [ ] **Step 4: 跑测试 + 提交**

```bash
pnpm test
git add server
git commit -m "feat(server): JWT sign/verify"
```

---

### Task 3.3: 鉴权中间件

**Files:**
- Create: `server/src/middleware/auth.ts`
- Create: `server/tests/middleware/auth.test.ts`

- [ ] **Step 1: 写测试**

```typescript
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware } from '../../src/middleware/auth.js';
import { signToken } from '../../src/services/auth.js';

describe('authMiddleware', () => {
  const SECRET = 'test-secret';
  function app() {
    const a = new Hono();
    a.use('*', authMiddleware(SECRET));
    a.get('/me', (c) => c.json(c.get('claims' as any)));
    return a;
  }

  it('rejects missing header', async () => {
    const res = await app().request('/me');
    expect(res.status).toBe(401);
  });

  it('rejects bad token', async () => {
    const res = await app().request('/me', {
      headers: { Authorization: 'Bearer notatoken' },
    });
    expect(res.status).toBe(401);
  });

  it('attaches claims for valid token', async () => {
    const token = await signToken({ operatorId: 'op1', storeId: 's1' }, SECRET);
    const res = await app().request('/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.operatorId).toBe('op1');
  });
});
```

- [ ] **Step 2: 写实现 `server/src/middleware/auth.ts`**

```typescript
import type { MiddlewareHandler } from 'hono';
import { verifyToken } from '../services/auth.js';

export function authMiddleware(secret: string): MiddlewareHandler {
  return async (c, next) => {
    const auth = c.req.header('authorization');
    if (!auth?.startsWith('Bearer ')) return c.json({ error: 'unauthorized' }, 401);

    const token = auth.slice('Bearer '.length);
    try {
      const claims = await verifyToken(token, secret);
      c.set('claims' as any, claims);
      await next();
    } catch {
      return c.json({ error: 'unauthorized' }, 401);
    }
  };
}
```

- [ ] **Step 3: 跑测试 + 提交**

```bash
pnpm test
git add server
git commit -m "feat(server): auth middleware"
```

---

### Task 3.4: 登录路由(发码 + 验码换 token)

**Files:**
- Create: `server/src/routes/auth.ts`
- Create: `server/tests/routes/auth.test.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: 写测试 `server/tests/routes/auth.test.ts`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildAuthRouter } from '../../src/routes/auth.js';

describe('auth routes', () => {
  let app: ReturnType<typeof buildAuthRouter>;
  let db: ReturnType<typeof openDb>;

  beforeEach(() => {
    db = openDb(':memory:');
    runMigrations(db);
    db.prepare(
      "INSERT INTO operators (id, store_id, phone, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run('op1', 'store1', '13800001111', '店主', 'owner', Date.now());

    vi.spyOn(console, 'log').mockImplementation(() => {});
    app = buildAuthRouter(db, 'test-secret', { });
  });

  it('rejects unknown phone', async () => {
    const res = await app.request('/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800002222' }),
    });
    expect(res.status).toBe(403);
  });

  it('issues code for known phone', async () => {
    const res = await app.request('/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800001111' }),
    });
    expect(res.status).toBe(200);
    const row = db.prepare('SELECT code FROM sms_codes WHERE phone=?').get('13800001111') as any;
    expect(row.code).toMatch(/^\d{6}$/);
  });

  it('exchanges code for token', async () => {
    await app.request('/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800001111' }),
    });
    const row = db.prepare('SELECT code FROM sms_codes WHERE phone=?').get('13800001111') as any;

    const res = await app.request('/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800001111', code: row.code }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.operator.name).toBe('店主');
  });

  it('rejects wrong code', async () => {
    await app.request('/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800001111' }),
    });
    const res = await app.request('/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800001111', code: '000000' }),
    });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

- [ ] **Step 3: 写 `server/src/routes/auth.ts`**

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import type { DB } from '../db.js';
import { sendVerificationCode } from '../services/sms.js';
import { signToken } from '../services/auth.js';

const phoneSchema = z.object({ phone: z.string().regex(/^1[3-9]\d{9}$/) });
const verifySchema = phoneSchema.extend({ code: z.string().regex(/^\d{6}$/) });

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

interface SmsConfig {
  ALIYUN_SMS_ACCESS_KEY?: string;
  ALIYUN_SMS_SECRET?: string;
  ALIYUN_SMS_SIGN?: string;
}

export function buildAuthRouter(db: DB, jwtSecret: string, smsConfig: SmsConfig) {
  const app = new Hono();

  app.post('/code', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = phoneSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_phone' }, 400);

    const op = db.prepare(
      'SELECT id, store_id FROM operators WHERE phone=?',
    ).get(parsed.data.phone) as any;
    if (!op) return c.json({ error: 'not_authorized' }, 403);

    const code = genCode();
    const expiresAt = Date.now() + 5 * 60_000;

    db.prepare(
      `INSERT INTO sms_codes (phone, code, expires_at, attempts)
       VALUES (?, ?, ?, 0)
       ON CONFLICT(phone) DO UPDATE SET code=excluded.code, expires_at=excluded.expires_at, attempts=0`,
    ).run(parsed.data.phone, code, expiresAt);

    await sendVerificationCode(parsed.data.phone, code, smsConfig);
    return c.json({ ok: true });
  });

  app.post('/verify', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

    const row = db.prepare('SELECT * FROM sms_codes WHERE phone=?').get(parsed.data.phone) as any;
    if (!row) return c.json({ error: 'no_code' }, 401);
    if (Date.now() > row.expires_at) return c.json({ error: 'code_expired' }, 401);
    if (row.attempts >= 5) return c.json({ error: 'too_many_attempts' }, 429);

    if (row.code !== parsed.data.code) {
      db.prepare('UPDATE sms_codes SET attempts=attempts+1 WHERE phone=?').run(parsed.data.phone);
      return c.json({ error: 'wrong_code' }, 401);
    }

    db.prepare('DELETE FROM sms_codes WHERE phone=?').run(parsed.data.phone);

    const op = db.prepare(
      'SELECT id, store_id, name, role FROM operators WHERE phone=?',
    ).get(parsed.data.phone) as any;

    db.prepare('UPDATE operators SET last_login_at=? WHERE id=?').run(Date.now(), op.id);

    const token = await signToken({ operatorId: op.id, storeId: op.store_id }, jwtSecret);
    return c.json({
      token,
      operator: { id: op.id, name: op.name, role: op.role, storeId: op.store_id },
    });
  });

  return app;
}
```

- [ ] **Step 4: 挂到主 app — 改 `server/src/index.ts`**

```typescript
import { buildAuthRouter } from './routes/auth.js';

// 在已有路由后追加:
app.route('/api/auth', buildAuthRouter(db, env.JWT_SECRET, {
  ALIYUN_SMS_ACCESS_KEY: env.ALIYUN_SMS_ACCESS_KEY,
  ALIYUN_SMS_SECRET: env.ALIYUN_SMS_SECRET,
  ALIYUN_SMS_SIGN: env.ALIYUN_SMS_SIGN,
}));
```

- [ ] **Step 5: 跑测试通过 + 提交**

```bash
pnpm test
git add server
git commit -m "feat(server): SMS-code login with JWT issuance"
```

---

### Task 3.5: 后台 - 登录页

**Files:**
- Create: `apps/admin/src/store/auth.ts`
- Modify: `apps/admin/src/api.ts`
- Modify: `apps/admin/src/pages/Login.vue`
- Modify: `apps/admin/src/router.ts`
- Create: `apps/admin/src/pages/Dashboard.vue`(占位)

- [ ] **Step 1: 写 `apps/admin/src/store/auth.ts`**

```typescript
import { defineStore } from 'pinia';

interface Operator { id: string; name: string; role: string; storeId: string; }

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') ?? '',
    operator: JSON.parse(localStorage.getItem('operator') ?? 'null') as Operator | null,
  }),
  actions: {
    setSession(token: string, operator: Operator) {
      this.token = token;
      this.operator = operator;
      localStorage.setItem('token', token);
      localStorage.setItem('operator', JSON.stringify(operator));
    },
    logout() {
      this.token = '';
      this.operator = null;
      localStorage.removeItem('token');
      localStorage.removeItem('operator');
    },
  },
});
```

- [ ] **Step 2: 改 `apps/admin/src/api.ts`**

```typescript
const BASE = '/api';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  requestCode: (phone: string) =>
    http<{ ok: true }>('/auth/code', {
      method: 'POST', body: JSON.stringify({ phone }),
    }),
  verifyCode: (phone: string, code: string) =>
    http<{ token: string; operator: { id: string; name: string; role: string; storeId: string } }>(
      '/auth/verify', { method: 'POST', body: JSON.stringify({ phone, code }) },
    ),
};
```

- [ ] **Step 3: 改 `apps/admin/src/pages/Login.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import { useAuthStore } from '../store/auth.js';

const router = useRouter();
const auth = useAuthStore();
const phone = ref('');
const code = ref('');
const cooldown = ref(0);
const loading = ref(false);
const error = ref('');

let timer: number | undefined;
async function getCode() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) { error.value = '请输入正确的手机号'; return; }
  error.value = '';
  try {
    await api.requestCode(phone.value);
    cooldown.value = 60;
    timer = window.setInterval(() => {
      cooldown.value -= 1;
      if (cooldown.value <= 0) clearInterval(timer);
    }, 1000);
  } catch (e: any) {
    error.value = e.message.includes('403') ? '该手机号无权限' : '获取验证码失败';
  }
}

async function login() {
  if (!code.value) { error.value = '请输入验证码'; return; }
  loading.value = true;
  error.value = '';
  try {
    const { token, operator } = await api.verifyCode(phone.value, code.value);
    auth.setSession(token, operator);
    router.push('/dashboard');
  } catch (e: any) {
    error.value = '验证码错误或已失效';
  } finally { loading.value = false; }
}
</script>

<template>
  <div class="max-w-sm mx-auto pt-20 px-6">
    <h1 class="text-2xl font-bold mb-8 text-center">店主后台</h1>

    <label class="block mb-4">
      <span class="text-sm text-gray-600">手机号</span>
      <input v-model="phone" type="tel" maxlength="11"
        class="mt-1 w-full border rounded p-3"/>
    </label>

    <label class="block mb-4">
      <span class="text-sm text-gray-600">验证码</span>
      <div class="flex gap-2 mt-1">
        <input v-model="code" maxlength="6"
          class="flex-1 border rounded p-3" placeholder="6 位数字"/>
        <button @click="getCode" :disabled="cooldown > 0"
          class="px-4 bg-blue-500 disabled:bg-gray-300 text-white rounded text-sm">
          {{ cooldown > 0 ? `${cooldown}s` : '获取验证码' }}
        </button>
      </div>
    </label>

    <button @click="login" :disabled="loading"
      class="w-full bg-blue-600 disabled:bg-gray-300 text-white py-3 rounded mt-4">
      {{ loading ? '登录中...' : '登录' }}
    </button>
    <p v-if="error" class="text-red-500 text-sm mt-3">{{ error }}</p>
  </div>
</template>
```

- [ ] **Step 4: 创建占位 Dashboard `apps/admin/src/pages/Dashboard.vue`**

```vue
<script setup lang="ts">
import { useAuthStore } from '../store/auth.js';
const auth = useAuthStore();
</script>

<template>
  <div class="p-6">
    <h1 class="text-xl font-bold mb-2">数据看板</h1>
    <p class="text-gray-600">欢迎,{{ auth.operator?.name }}</p>
    <p class="text-gray-400 text-sm mt-4">(下个任务填充数据)</p>
  </div>
</template>
```

- [ ] **Step 5: 改 `apps/admin/src/router.ts` 加路由保护**

```typescript
import { createRouter, createWebHistory } from 'vue-router';
import Login from './pages/Login.vue';
import Dashboard from './pages/Dashboard.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', component: Login },
    { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
  ],
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('token')) {
    return { path: '/login' };
  }
  if (to.path === '/login' && localStorage.getItem('token')) {
    return { path: '/dashboard' };
  }
});
```

- [ ] **Step 6: vite proxy 加 `/api/auth`(已经被 `/api` 通配覆盖,只需要确认 admin 的 vite.config)**

`apps/admin/vite.config.ts` 已经代理 `/api`,无需修改。

- [ ] **Step 7: 手动验证**

```bash
# 终端 1
pnpm dev:server
# 终端 2
pnpm dev:admin
```

操作:
1. 启动前先往 db 里插一条 operator(临时手动):
   ```bash
   sqlite3 server/data/commentsys.db "INSERT INTO operators (id, store_id, phone, name, role, created_at) VALUES ('op1', 'default-store', '你的手机号', '店主', 'owner', strftime('%s','now')*1000);"
   ```
2. 浏览器打开 `http://localhost:5174/login`,输手机号 → 看后端日志拿到验证码 → 输入登录 → 跳到 dashboard。

- [ ] **Step 8: 提交**

```bash
git add apps/admin
git commit -m "feat(admin): SMS-code login + auth store + route guard"
```

---

### Task 3.6: 数据看板 - 后端 stats 接口

**Files:**
- Create: `server/src/routes/stats.ts`
- Create: `server/tests/routes/stats.test.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: 写测试**

`server/tests/routes/stats.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildStatsRouter } from '../../src/routes/stats.js';
import { signToken } from '../../src/services/auth.js';

const SECRET = 'test';

async function tokenFor(storeId: string) {
  return await signToken({ operatorId: 'op1', storeId }, SECRET);
}

describe('GET /admin/stats', () => {
  let app: ReturnType<typeof buildStatsRouter>;
  let db: ReturnType<typeof openDb>;

  beforeEach(() => {
    db = openDb(':memory:');
    runMigrations(db);
    app = buildStatsRouter(db, SECRET);

    // 插入测试数据
    const now = Date.now();
    db.prepare("INSERT INTO sessions (id, store_id, rating, created_at) VALUES (?, ?, ?, ?)")
      .run('s1', 's1', 5, now);
    db.prepare("INSERT INTO sessions (id, store_id, rating, created_at) VALUES (?, ?, ?, ?)")
      .run('s2', 's1', 4, now);
    db.prepare("INSERT INTO sessions (id, store_id, rating, created_at) VALUES (?, ?, ?, ?)")
      .run('s3', 's1', 2, now);

    db.prepare(`INSERT INTO reviews (id, session_id, store_id, rating, platform, copied_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run('r1', 's1', 's1', 5, 'dianping', now, now);

    db.prepare(`INSERT INTO complaints (id, session_id, store_id, rating, message, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run('c1', 's3', 's1', 2, 'bad', 'pending', now);
  });

  it('returns aggregated counts for today', async () => {
    const token = await tokenFor('s1');
    const res = await app.request('/?range=today', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalSessions).toBe(3);
    expect(body.ratingBreakdown).toEqual({ '1': 0, '2': 1, '3': 0, '4': 1, '5': 1 });
    expect(body.platformJumps.dianping).toBe(1);
    expect(body.pendingComplaints).toBe(1);
  });

  it('scopes by storeId from token', async () => {
    db.prepare("INSERT INTO sessions (id, store_id, rating, created_at) VALUES (?, ?, ?, ?)")
      .run('sx', 'OTHER_STORE', 5, Date.now());

    const token = await tokenFor('s1');
    const res = await app.request('/?range=today', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.totalSessions).toBe(3);
  });

  it('rejects without token', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

- [ ] **Step 3: 写 `server/src/routes/stats.ts`**

```typescript
import { Hono } from 'hono';
import type { DB } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

function rangeStart(range: string): number {
  const d = new Date();
  if (range === 'week') d.setDate(d.getDate() - 7);
  else if (range === 'month') d.setMonth(d.getMonth() - 1);
  else { d.setHours(0, 0, 0, 0); }
  return d.getTime();
}

export function buildStatsRouter(db: DB, jwtSecret: string) {
  const app = new Hono();
  app.use('*', authMiddleware(jwtSecret));

  app.get('/', (c) => {
    const claims = c.get('claims' as any) as { storeId: string };
    const range = c.req.query('range') ?? 'today';
    const since = rangeStart(range);

    const totalSessions = (db.prepare(
      'SELECT COUNT(*) AS n FROM sessions WHERE store_id=? AND created_at>=?',
    ).get(claims.storeId, since) as any).n;

    const ratingRows = db.prepare(
      'SELECT rating, COUNT(*) AS n FROM sessions WHERE store_id=? AND rating IS NOT NULL AND created_at>=? GROUP BY rating',
    ).all(claims.storeId, since) as Array<{ rating: number; n: number }>;
    const ratingBreakdown: Record<string, number> = { '1':0,'2':0,'3':0,'4':0,'5':0 };
    for (const r of ratingRows) ratingBreakdown[String(r.rating)] = r.n;

    const platformRows = db.prepare(
      'SELECT platform, COUNT(*) AS n FROM reviews WHERE store_id=? AND copied_at IS NOT NULL AND created_at>=? GROUP BY platform',
    ).all(claims.storeId, since) as Array<{ platform: string; n: number }>;
    const platformJumps: Record<string, number> = {
      dianping: 0, meituan: 0, douyin: 0, xiaohongshu: 0,
    };
    for (const p of platformRows) platformJumps[p.platform] = p.n;

    const pendingComplaints = (db.prepare(
      "SELECT COUNT(*) AS n FROM complaints WHERE store_id=? AND status='pending'",
    ).get(claims.storeId) as any).n;

    return c.json({
      range,
      totalSessions,
      ratingBreakdown,
      platformJumps,
      totalJumps: Object.values(platformJumps).reduce((a, b) => a + b, 0),
      pendingComplaints,
    });
  });

  return app;
}
```

- [ ] **Step 4: 挂到 main — `server/src/index.ts` 追加**

```typescript
import { buildStatsRouter } from './routes/stats.js';
app.route('/api/admin/stats', buildStatsRouter(db, env.JWT_SECRET));
```

- [ ] **Step 5: 跑测试 + 提交**

```bash
pnpm test
git add server
git commit -m "feat(server): stats endpoint with date-range and store scoping"
```

---

### Task 3.7: 数据看板 - 前端

**Files:**
- Modify: `apps/admin/src/api.ts`
- Modify: `apps/admin/src/pages/Dashboard.vue`

- [ ] **Step 1: 扩展 `apps/admin/src/api.ts`**

```typescript
interface Stats {
  range: string;
  totalSessions: number;
  ratingBreakdown: Record<string, number>;
  platformJumps: Record<string, number>;
  totalJumps: number;
  pendingComplaints: number;
}

// 追加在 api 内:
getStats: (range: 'today' | 'week' | 'month') =>
  http<Stats>(`/admin/stats?range=${range}`),
```

- [ ] **Step 2: 重写 `apps/admin/src/pages/Dashboard.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import { useAuthStore } from '../store/auth.js';

const router = useRouter();
const auth = useAuthStore();
const range = ref<'today' | 'week' | 'month'>('today');
const data = ref<any>(null);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    data.value = await api.getStats(range.value);
  } catch (e) {
    if (String(e).includes('401')) {
      auth.logout();
      router.push('/login');
    }
  } finally { loading.value = false; }
}

onMounted(load);
</script>

<template>
  <div class="p-4 max-w-md mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">数据看板</h1>
      <button @click="router.push('/complaints')"
        class="text-sm text-blue-500">差评 →</button>
    </div>

    <div class="flex gap-2 mb-4">
      <button v-for="r in ['today','week','month'] as const" :key="r"
        @click="range = r; load()"
        class="px-3 py-1 rounded text-sm"
        :class="range === r ? 'bg-blue-500 text-white' : 'bg-gray-200'">
        {{ ({today:'今日',week:'本周',month:'本月'})[r] }}
      </button>
    </div>

    <div v-if="loading" class="text-gray-400">加载中...</div>
    <div v-else-if="data" class="space-y-3">

      <div class="bg-white rounded p-4 shadow-sm">
        <div class="text-sm text-gray-500 mb-1">扫码次数</div>
        <div class="text-3xl font-bold">{{ data.totalSessions }}</div>
      </div>

      <div class="bg-white rounded p-4 shadow-sm">
        <div class="text-sm text-gray-500 mb-2">评分分布</div>
        <div v-for="n in [5,4,3,2,1]" :key="n" class="flex items-center gap-2 mb-1">
          <span class="text-yellow-400 w-12">{{ '★'.repeat(n) }}</span>
          <div class="flex-1 bg-gray-100 rounded h-2 overflow-hidden">
            <div class="bg-yellow-400 h-full"
              :style="{ width: data.totalSessions ? `${data.ratingBreakdown[n]/data.totalSessions*100}%` : '0%' }"/>
          </div>
          <span class="w-8 text-right text-sm">{{ data.ratingBreakdown[n] }}</span>
        </div>
      </div>

      <div class="bg-white rounded p-4 shadow-sm">
        <div class="text-sm text-gray-500 mb-2">公域跳转 {{ data.totalJumps }}</div>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div>点评 <b>{{ data.platformJumps.dianping }}</b></div>
          <div>美团 <b>{{ data.platformJumps.meituan }}</b></div>
          <div>抖音 <b>{{ data.platformJumps.douyin }}</b></div>
          <div>小红书 <b>{{ data.platformJumps.xiaohongshu }}</b></div>
        </div>
      </div>

      <div v-if="data.pendingComplaints > 0"
        class="bg-red-50 border border-red-200 rounded p-4 flex items-center justify-between"
        @click="router.push('/complaints')">
        <span class="text-red-700">🔴 差评待处理 {{ data.pendingComplaints }} 条</span>
        <span class="text-red-500">→</span>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 提交**

```bash
git add apps/admin
git commit -m "feat(admin): dashboard with rating distribution and platform jumps"
```

---

### Task 3.8: 差评中心 - 后端

**Files:**
- Create: `server/src/routes/complaints.ts`
- Create: `server/tests/routes/complaints.test.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: 写测试**

`server/tests/routes/complaints.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildComplaintsRouter } from '../../src/routes/complaints.js';
import { signToken } from '../../src/services/auth.js';

const SECRET = 'test';

describe('admin/complaints', () => {
  let app: ReturnType<typeof buildComplaintsRouter>;
  let db: ReturnType<typeof openDb>;
  let token: string;

  beforeEach(async () => {
    db = openDb(':memory:');
    runMigrations(db);
    app = buildComplaintsRouter(db, SECRET);
    token = await signToken({ operatorId: 'op1', storeId: 's1' }, SECRET);

    const now = Date.now();
    db.prepare("INSERT INTO sessions (id, store_id, rating, created_at) VALUES (?, ?, ?, ?)")
      .run('sess1', 's1', 2, now);
    db.prepare(`INSERT INTO complaints (id, session_id, store_id, rating, message, contact, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('c1', 'sess1', 's1', 2, '太轻了', '13800001234', 'pending', now);
  });

  it('lists pending complaints', async () => {
    const res = await app.request('/?status=pending', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].message).toBe('太轻了');
  });

  it('marks a complaint as handled', async () => {
    const res = await app.request('/c1/handle', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: '已电话补救' }),
    });
    expect(res.status).toBe(200);
    const row = db.prepare('SELECT status, handler_id, handler_note FROM complaints WHERE id=?').get('c1') as any;
    expect(row.status).toBe('handled');
    expect(row.handler_id).toBe('op1');
    expect(row.handler_note).toBe('已电话补救');
  });

  it('rejects updates to other stores complaints', async () => {
    db.prepare(`INSERT INTO complaints (id, session_id, store_id, rating, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run('c2', 'sess1', 'OTHER', 1, 'x', 'pending', Date.now());
    const res = await app.request('/c2/handle', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: 'x' }),
    });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

- [ ] **Step 3: 写 `server/src/routes/complaints.ts`**

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import type { DB } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const handleSchema = z.object({ note: z.string().max(500).optional() });

export function buildComplaintsRouter(db: DB, jwtSecret: string) {
  const app = new Hono();
  app.use('*', authMiddleware(jwtSecret));

  app.get('/', (c) => {
    const claims = c.get('claims' as any) as { storeId: string };
    const status = c.req.query('status') ?? 'pending';
    const rows = db.prepare(
      `SELECT id, rating, message, contact, status, handler_note, created_at, handled_at
       FROM complaints
       WHERE store_id=? AND status=?
       ORDER BY created_at DESC
       LIMIT 100`,
    ).all(claims.storeId, status);
    return c.json({ items: rows });
  });

  app.post('/:id/handle', async (c) => {
    const claims = c.get('claims' as any) as { storeId: string; operatorId: string };
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const parsed = handleSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

    const row = db.prepare('SELECT 1 FROM complaints WHERE id=? AND store_id=?')
      .get(id, claims.storeId);
    if (!row) return c.json({ error: 'not_found' }, 404);

    db.prepare(
      `UPDATE complaints SET status='handled', handler_id=?, handler_note=?, handled_at=?
       WHERE id=?`,
    ).run(claims.operatorId, parsed.data.note ?? null, Date.now(), id);

    return c.json({ ok: true });
  });

  return app;
}
```

- [ ] **Step 4: 挂到 main**

```typescript
import { buildComplaintsRouter } from './routes/complaints.js';
app.route('/api/admin/complaints', buildComplaintsRouter(db, env.JWT_SECRET));
```

- [ ] **Step 5: 跑测试通过 + 提交**

```bash
pnpm test
git add server
git commit -m "feat(server): admin complaints list + handle endpoints"
```

---

### Task 3.9: 差评中心 - 前端

**Files:**
- Modify: `apps/admin/src/api.ts`
- Create: `apps/admin/src/pages/Complaints.vue`
- Modify: `apps/admin/src/router.ts`

- [ ] **Step 1: 扩展 `apps/admin/src/api.ts`**

```typescript
interface Complaint {
  id: string; rating: number; message: string; contact: string | null;
  status: 'pending' | 'handled'; handler_note: string | null;
  created_at: number; handled_at: number | null;
}

// 追加:
listComplaints: (status: 'pending' | 'handled') =>
  http<{ items: Complaint[] }>(`/admin/complaints?status=${status}`),
handleComplaint: (id: string, note: string) =>
  http<{ ok: true }>(`/admin/complaints/${id}/handle`, {
    method: 'POST', body: JSON.stringify({ note }),
  }),
```

- [ ] **Step 2: 写 `apps/admin/src/pages/Complaints.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api.js';

const status = ref<'pending' | 'handled'>('pending');
const items = ref<any[]>([]);
const loading = ref(false);
const handlingId = ref('');
const noteInput = ref('');

async function load() {
  loading.value = true;
  try {
    const { items: list } = await api.listComplaints(status.value);
    items.value = list;
  } finally { loading.value = false; }
}

async function handle(id: string) {
  await api.handleComplaint(id, noteInput.value);
  handlingId.value = '';
  noteInput.value = '';
  load();
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth()+1}-${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

onMounted(load);
</script>

<template>
  <div class="p-4 max-w-md mx-auto">
    <h1 class="text-xl font-bold mb-4">差评中心</h1>

    <div class="flex gap-2 mb-4">
      <button @click="status = 'pending'; load()"
        class="px-3 py-1 rounded text-sm"
        :class="status === 'pending' ? 'bg-red-500 text-white' : 'bg-gray-200'">
        待处理
      </button>
      <button @click="status = 'handled'; load()"
        class="px-3 py-1 rounded text-sm"
        :class="status === 'handled' ? 'bg-gray-500 text-white' : 'bg-gray-200'">
        已处理
      </button>
    </div>

    <div v-if="loading" class="text-gray-400">加载中...</div>
    <p v-else-if="items.length === 0" class="text-gray-400 text-center mt-12">暂无</p>

    <div v-for="item in items" :key="item.id"
      class="bg-white border rounded p-4 mb-3"
      :class="status === 'pending' ? 'border-red-200' : 'border-gray-200'">
      <div class="flex justify-between mb-2">
        <span class="text-yellow-500">{{ '★'.repeat(item.rating) }}{{ '☆'.repeat(5-item.rating) }}</span>
        <span class="text-xs text-gray-400">{{ fmtTime(item.created_at) }}</span>
      </div>
      <p class="text-sm mb-2">{{ item.message }}</p>
      <p v-if="item.contact" class="text-sm text-gray-600">
        联系: <a :href="`tel:${item.contact}`" class="text-blue-500">{{ item.contact }}</a>
      </p>
      <p v-if="item.handler_note" class="text-xs text-gray-500 mt-2">处理备注:{{ item.handler_note }}</p>

      <div v-if="status === 'pending'" class="mt-3">
        <div v-if="handlingId === item.id" class="space-y-2">
          <textarea v-model="noteInput" rows="2" placeholder="处理备注"
            class="w-full border rounded p-2 text-sm"/>
          <div class="flex gap-2">
            <button @click="handle(item.id)"
              class="flex-1 bg-blue-500 text-white py-2 rounded text-sm">确认已处理</button>
            <button @click="handlingId = ''" class="px-3 bg-gray-200 rounded text-sm">取消</button>
          </div>
        </div>
        <button v-else @click="handlingId = item.id; noteInput = ''"
          class="w-full bg-blue-500 text-white py-2 rounded text-sm">
          标记已处理
        </button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 加路由 `apps/admin/src/router.ts`**

```typescript
// routes 数组里追加:
import Complaints from './pages/Complaints.vue';
{ path: '/complaints', component: Complaints, meta: { requiresAuth: true } },
```

- [ ] **Step 4: 手动验证**

刷新 admin,点 Dashboard 上的"差评 →",进入差评列表,点"标记已处理",填备注,确认 → 切到"已处理"标签能看到该条。

- [ ] **Step 5: 提交**

```bash
git add apps/admin
git commit -m "feat(admin): complaints list and handle UI"
```

---

### Task 3.10: 操作日志服务

**Files:**
- Create: `server/src/services/audit.ts`
- Create: `server/tests/services/audit.test.ts`
- Modify: `server/src/routes/complaints.ts`(在 handle 时记日志)

- [ ] **Step 1: 写测试**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { logAction } from '../../src/services/audit.js';

describe('audit log', () => {
  let db: ReturnType<typeof openDb>;
  beforeEach(() => { db = openDb(':memory:'); runMigrations(db); });

  it('records an action', () => {
    logAction(db, {
      operatorId: 'op1',
      action: 'complaint_handled',
      targetType: 'complaint',
      targetId: 'c1',
      details: { note: 'called' },
    });
    const row = db.prepare('SELECT * FROM audit_logs').get() as any;
    expect(row.operator_id).toBe('op1');
    expect(row.action).toBe('complaint_handled');
    expect(JSON.parse(row.details)).toEqual({ note: 'called' });
  });
});
```

- [ ] **Step 2: 写实现 `server/src/services/audit.ts`**

```typescript
import { randomUUID } from 'node:crypto';
import type { DB } from '../db.js';

interface LogInput {
  operatorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: unknown;
}

export function logAction(db: DB, input: LogInput): void {
  db.prepare(
    `INSERT INTO audit_logs (id, operator_id, action, target_type, target_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    input.operatorId,
    input.action,
    input.targetType ?? null,
    input.targetId ?? null,
    input.details ? JSON.stringify(input.details) : null,
    Date.now(),
  );
}
```

- [ ] **Step 3: 在 complaints handle 时调用 audit**

修改 `server/src/routes/complaints.ts` 的 handle 处理器:

```typescript
import { logAction } from '../services/audit.js';

// 在 UPDATE 之后追加:
logAction(db, {
  operatorId: claims.operatorId,
  action: 'complaint_handled',
  targetType: 'complaint',
  targetId: id,
  details: { note: parsed.data.note ?? null },
});
```

- [ ] **Step 4: 跑测试 + 提交**

```bash
pnpm test
git add server
git commit -m "feat(server): audit log + record complaint handling"
```

---


## Phase 4: 照片库

目标:店主在后台上传 30-50 张店内照片并打标签;顾客端按平台+标签+星级智能匹配展示。

### Task 4.1: 图片存储抽象层

**Files:**
- Create: `server/src/services/photoStore.ts`
- Create: `server/tests/services/photoStore.test.ts`

> 抽象出 `PhotoStore` 接口,实现本地文件系统(开发)和阿里云 OSS(生产)。

- [ ] **Step 1: 写测试**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalPhotoStore } from '../../src/services/photoStore.js';

describe('LocalPhotoStore', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'photo-')); });

  it('uploads and serves a file', async () => {
    const store = new LocalPhotoStore(dir, '/uploads');
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const { url, key } = await store.upload(buf, 'image/jpeg');
    expect(url).toMatch(/^\/uploads\//);
    expect(existsSync(join(dir, key))).toBe(true);
    rmSync(dir, { recursive: true });
  });
});
```

- [ ] **Step 2: 实现 `server/src/services/photoStore.ts`**

```typescript
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface UploadResult {
  url: string;
  key: string;
}

export interface PhotoStore {
  upload(data: Buffer, mime: string): Promise<UploadResult>;
}

export class LocalPhotoStore implements PhotoStore {
  constructor(private rootDir: string, private urlPrefix: string) {}

  async upload(data: Buffer, mime: string): Promise<UploadResult> {
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const key = `${new Date().toISOString().slice(0,10)}/${randomUUID()}.${ext}`;
    const fullPath = join(this.rootDir, key);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, data);
    return { url: `${this.urlPrefix}/${key}`, key };
  }
}
```

- [ ] **Step 3: 跑测试 + 提交**

```bash
pnpm test
git add server
git commit -m "feat(server): local photo store abstraction"
```

---

### Task 4.2: 后端 - 照片 CRUD 接口

**Files:**
- Create: `server/src/routes/photos.ts`
- Create: `server/tests/routes/photos.test.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: 写测试**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb, runMigrations } from '../../src/db.js';
import { buildPhotosRouter } from '../../src/routes/photos.js';
import { LocalPhotoStore } from '../../src/services/photoStore.js';
import { signToken } from '../../src/services/auth.js';

const SECRET = 'test';

describe('admin/photos', () => {
  let app: ReturnType<typeof buildPhotosRouter>;
  let db: ReturnType<typeof openDb>;
  let token: string;
  let dir: string;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'photos-'));
    db = openDb(':memory:');
    runMigrations(db);
    const store = new LocalPhotoStore(dir, '/uploads');
    app = buildPhotosRouter(db, store, SECRET);
    token = await signToken({ operatorId: 'op1', storeId: 's1' }, SECRET);
  });

  it('uploads and lists photo', async () => {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array([1,2,3,4])], { type: 'image/jpeg' }), 'test.jpg');
    form.append('type', '环境');
    form.append('platforms', JSON.stringify(['dianping', 'meituan']));
    form.append('rating_match', JSON.stringify([4, 5]));
    form.append('tags', JSON.stringify(['头皮检测']));

    const upRes = await app.request('/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    expect(upRes.status).toBe(200);

    const listRes = await app.request('/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await listRes.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].type).toBe('环境');

    rmSync(dir, { recursive: true });
  });

  it('deletes a photo', async () => {
    db.prepare(`INSERT INTO photos (id, store_id, url, type, platforms, rating_match, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('p1', 's1', '/x.jpg', '环境', '[]', '[]', '[]', Date.now());

    const res = await app.request('/p1', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const left = db.prepare('SELECT COUNT(*) AS n FROM photos').get() as any;
    expect(left.n).toBe(0);
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

- [ ] **Step 3: 实现 `server/src/routes/photos.ts`**

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { DB } from '../db.js';
import type { PhotoStore } from '../services/photoStore.js';
import { authMiddleware } from '../middleware/auth.js';

const metadataSchema = z.object({
  type: z.enum(['环境', '过程', '效果']),
  platforms: z.array(z.string()),
  rating_match: z.array(z.number()),
  tags: z.array(z.string()).default([]),
});

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export function buildPhotosRouter(db: DB, store: PhotoStore, jwtSecret: string) {
  const app = new Hono();
  app.use('*', authMiddleware(jwtSecret));

  app.get('/', (c) => {
    const claims = c.get('claims' as any) as { storeId: string };
    const items = db.prepare(
      `SELECT id, url, type, platforms, rating_match, tags, use_count, created_at
       FROM photos WHERE store_id=? ORDER BY created_at DESC`,
    ).all(claims.storeId).map((r: any) => ({
      ...r,
      platforms: JSON.parse(r.platforms),
      rating_match: JSON.parse(r.rating_match),
      tags: JSON.parse(r.tags || '[]'),
    }));
    return c.json({ items });
  });

  app.post('/', async (c) => {
    const claims = c.get('claims' as any) as { storeId: string; operatorId: string };
    const form = await c.req.formData();
    const file = form.get('file') as File | null;
    if (!file) return c.json({ error: 'no_file' }, 400);
    if (!ALLOWED_MIME.includes(file.type)) return c.json({ error: 'bad_mime' }, 400);
    if (file.size > MAX_BYTES) return c.json({ error: 'too_large' }, 413);

    const meta = metadataSchema.safeParse({
      type: form.get('type'),
      platforms: JSON.parse(String(form.get('platforms') ?? '[]')),
      rating_match: JSON.parse(String(form.get('rating_match') ?? '[]')),
      tags: JSON.parse(String(form.get('tags') ?? '[]')),
    });
    if (!meta.success) return c.json({ error: 'bad_metadata' }, 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await store.upload(buffer, file.type);

    const id = randomUUID();
    db.prepare(
      `INSERT INTO photos (id, store_id, url, type, platforms, rating_match, tags, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id, claims.storeId, url, meta.data.type,
      JSON.stringify(meta.data.platforms),
      JSON.stringify(meta.data.rating_match),
      JSON.stringify(meta.data.tags),
      claims.operatorId, Date.now(),
    );

    return c.json({ id, url });
  });

  app.delete('/:id', (c) => {
    const claims = c.get('claims' as any) as { storeId: string };
    const id = c.req.param('id');
    const result = db.prepare('DELETE FROM photos WHERE id=? AND store_id=?')
      .run(id, claims.storeId);
    if (result.changes === 0) return c.json({ error: 'not_found' }, 404);
    return c.json({ ok: true });
  });

  return app;
}
```

- [ ] **Step 4: 挂到 main + 配置静态文件服务**

`server/src/index.ts` 修改:

```typescript
import { buildPhotosRouter } from './routes/photos.js';
import { LocalPhotoStore } from './services/photoStore.js';
import { serveStatic } from '@hono/node-server/serve-static';
import { mkdirSync } from 'node:fs';

const UPLOAD_DIR = './data/uploads';
mkdirSync(UPLOAD_DIR, { recursive: true });
const photoStore = new LocalPhotoStore(UPLOAD_DIR, '/uploads');

app.use('/uploads/*', serveStatic({ root: './data' }));
app.route('/api/admin/photos', buildPhotosRouter(db, photoStore, env.JWT_SECRET));
```

- [ ] **Step 5: 跑测试 + 提交**

```bash
pnpm test
git add server
git commit -m "feat(server): photo upload/list/delete with local storage"
```

---

### Task 4.3: 后台 - 照片管理页

**Files:**
- Modify: `apps/admin/src/api.ts`
- Create: `apps/admin/src/pages/Photos.vue`
- Modify: `apps/admin/src/router.ts`

- [ ] **Step 1: 扩展 `apps/admin/src/api.ts`**

```typescript
interface Photo {
  id: string; url: string; type: string;
  platforms: string[]; rating_match: number[]; tags: string[];
  use_count: number; created_at: number;
}

// 追加:
listPhotos: () =>
  http<{ items: Photo[] }>('/admin/photos'),

uploadPhoto: async (file: File, meta: {
  type: string; platforms: string[]; rating_match: number[]; tags: string[];
}) => {
  const form = new FormData();
  form.append('file', file);
  form.append('type', meta.type);
  form.append('platforms', JSON.stringify(meta.platforms));
  form.append('rating_match', JSON.stringify(meta.rating_match));
  form.append('tags', JSON.stringify(meta.tags));
  const token = localStorage.getItem('token');
  const res = await fetch('/api/admin/photos', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
},

deletePhoto: (id: string) =>
  http<{ ok: true }>(`/admin/photos/${id}`, { method: 'DELETE' }),
```

- [ ] **Step 2: 写 `apps/admin/src/pages/Photos.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api.js';

const items = ref<any[]>([]);
const uploading = ref(false);
const showUpload = ref(false);
const fileInput = ref<HTMLInputElement>();

const meta = ref({
  type: '环境' as '环境' | '过程' | '效果',
  platforms: ['dianping', 'meituan'] as string[],
  rating_match: [4, 5] as number[],
  tags: [] as string[],
});

async function load() {
  const { items: list } = await api.listPhotos();
  items.value = list;
}

async function onPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploading.value = true;
  try {
    await api.uploadPhoto(file, meta.value);
    showUpload.value = false;
    load();
  } catch (e: any) {
    alert('上传失败:' + e.message);
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

async function del(id: string) {
  if (!confirm('删除这张图?')) return;
  await api.deletePhoto(id);
  load();
}

function togglePlatform(p: string) {
  const i = meta.value.platforms.indexOf(p);
  if (i >= 0) meta.value.platforms.splice(i, 1); else meta.value.platforms.push(p);
}

function toggleRating(n: number) {
  const i = meta.value.rating_match.indexOf(n);
  if (i >= 0) meta.value.rating_match.splice(i, 1); else meta.value.rating_match.push(n);
}

onMounted(load);
</script>

<template>
  <div class="p-4 max-w-md mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">照片库 ({{ items.length }})</h1>
      <button @click="showUpload = !showUpload"
        class="px-3 py-1 bg-blue-500 text-white rounded text-sm">
        {{ showUpload ? '取消' : '+ 上传' }}
      </button>
    </div>

    <div v-if="showUpload" class="bg-white border rounded p-3 mb-4 space-y-3">
      <div>
        <div class="text-sm mb-1">类型</div>
        <select v-model="meta.type" class="w-full border rounded p-2 text-sm">
          <option value="环境">环境</option>
          <option value="过程">过程</option>
          <option value="效果">效果</option>
        </select>
      </div>
      <div>
        <div class="text-sm mb-1">适用平台</div>
        <div class="flex flex-wrap gap-1">
          <button v-for="p in ['dianping','meituan','douyin','xiaohongshu']" :key="p"
            @click="togglePlatform(p)"
            class="px-2 py-1 rounded text-xs border"
            :class="meta.platforms.includes(p) ? 'bg-blue-100 border-blue-500' : 'border-gray-300'">
            {{ ({dianping:'点评',meituan:'美团',douyin:'抖音',xiaohongshu:'小红书'})[p] }}
          </button>
        </div>
      </div>
      <div>
        <div class="text-sm mb-1">适合星级</div>
        <div class="flex gap-1">
          <button v-for="n in [3,4,5]" :key="n" @click="toggleRating(n)"
            class="px-3 py-1 rounded text-xs border"
            :class="meta.rating_match.includes(n) ? 'bg-yellow-100 border-yellow-500' : 'border-gray-300'">
            {{ n }}★
          </button>
        </div>
      </div>
      <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp"
        @change="onPick" class="w-full text-sm"/>
      <p v-if="uploading" class="text-sm text-gray-500">上传中...</p>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <div v-for="p in items" :key="p.id" class="relative aspect-square">
        <img :src="p.url" class="w-full h-full object-cover rounded"/>
        <button @click="del(p.id)"
          class="absolute top-1 right-1 bg-black/50 text-white text-xs px-1 rounded">×</button>
        <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 truncate">
          {{ p.type }}
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 加路由**

`apps/admin/src/router.ts`:
```typescript
import Photos from './pages/Photos.vue';
{ path: '/photos', component: Photos, meta: { requiresAuth: true } },
```

Dashboard 加跳转入口(在 `<div class="flex items-center justify-between">` 那块,改为):
```vue
<div class="flex gap-2 text-sm">
  <button @click="router.push('/photos')" class="text-blue-500">照片库</button>
  <button @click="router.push('/complaints')" class="text-blue-500">差评</button>
</div>
```

- [ ] **Step 4: 提交**

```bash
git add apps/admin
git commit -m "feat(admin): photo library upload/delete UI"
```

---

### Task 4.4: 顾客端照片推荐接口

**Files:**
- Modify: `server/src/routes/customer.ts`
- Create: `server/tests/routes/customer.photos.test.ts`

- [ ] **Step 1: 写测试**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildCustomerRouter } from '../../src/routes/customer.js';

describe('GET /customer/photos/recommend', () => {
  let app: ReturnType<typeof buildCustomerRouter>;
  let db: ReturnType<typeof openDb>;

  beforeEach(async () => {
    db = openDb(':memory:');
    runMigrations(db);

    db.prepare("INSERT INTO sessions (id, store_id, rating, created_at) VALUES (?, ?, ?, ?)")
      .run('sess1', 's1', 5, Date.now());

    const ins = db.prepare(`INSERT INTO photos (id, store_id, url, type, platforms, rating_match, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    ins.run('p1', 's1', '/1.jpg', '环境', '["dianping"]', '[5]', '["头皮检测"]', Date.now());
    ins.run('p2', 's1', '/2.jpg', '过程', '["dianping","meituan"]', '[4,5]', '[]', Date.now());
    ins.run('p3', 's1', '/3.jpg', '效果', '["xiaohongshu"]', '[5]', '[]', Date.now());

    app = buildCustomerRouter(db);
  });

  it('returns photos matching platform and rating', async () => {
    const res = await app.request('/photos/recommend?sessionId=sess1&platform=dianping&limit=5');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.map((p: any) => p.id).sort()).toEqual(['p1', 'p2']);
  });

  it('excludes platforms outside selection', async () => {
    const res = await app.request('/photos/recommend?sessionId=sess1&platform=xiaohongshu&limit=5');
    const body = await res.json();
    expect(body.items.map((p: any) => p.id)).toEqual(['p3']);
  });
});
```

- [ ] **Step 2: 写实现 — 在 `server/src/routes/customer.ts` 追加**

```typescript
const recommendSchema = z.object({
  sessionId: z.string().uuid(),
  platform: z.enum(PLATFORMS),
  limit: z.coerce.number().min(1).max(10).default(5),
});

app.get('/photos/recommend', (c) => {
  const parsed = recommendSchema.safeParse({
    sessionId: c.req.query('sessionId'),
    platform: c.req.query('platform'),
    limit: c.req.query('limit'),
  });
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

  const session = db.prepare('SELECT store_id, rating FROM sessions WHERE id=?')
    .get(parsed.data.sessionId) as any;
  if (!session) return c.json({ error: 'session_not_found' }, 404);

  const allPhotos = db.prepare(
    'SELECT id, url, type, platforms, rating_match FROM photos WHERE store_id=?',
  ).all(session.store_id) as any[];

  const filtered = allPhotos
    .map((p) => ({
      ...p,
      platforms: JSON.parse(p.platforms) as string[],
      rating_match: JSON.parse(p.rating_match) as number[],
    }))
    .filter((p) =>
      p.platforms.includes(parsed.data.platform) &&
      (session.rating == null || p.rating_match.includes(session.rating))
    );

  // 随机洗牌后取 limit 张
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }

  return c.json({ items: filtered.slice(0, parsed.data.limit) });
});
```

- [ ] **Step 3: 跑测试通过 + 提交**

```bash
pnpm test
git add server
git commit -m "feat(server): customer photo recommendation by platform+rating"
```

---

### Task 4.5: 顾客端照片选择 UI

**Files:**
- Modify: `apps/customer/src/api.ts`
- Modify: `apps/customer/src/pages/PositiveReview.vue`

- [ ] **Step 1: 扩展 `apps/customer/src/api.ts`**

```typescript
recommendPhotos: (sessionId: string, platform: string) =>
  http<{ items: Array<{ id: string; url: string; type: string }> }>(
    `/photos/recommend?sessionId=${sessionId}&platform=${platform}&limit=5`,
  ),
```

- [ ] **Step 2: 改 `apps/customer/src/pages/PositiveReview.vue`**

在 script setup 内补:
```typescript
const photos = ref<Array<{ id: string; url: string }>>([]);
const selectedPhotos = ref<string[]>([]);

async function loadPhotos() {
  if (!session.sessionId) return;
  try {
    const { items } = await api.recommendPhotos(session.sessionId, platform.value);
    photos.value = items;
  } catch { /* 静默失败:照片是可选项 */ }
}

function togglePhoto(id: string) {
  const i = selectedPhotos.value.indexOf(id);
  if (i >= 0) selectedPhotos.value.splice(i, 1);
  else if (selectedPhotos.value.length < 3) selectedPhotos.value.push(id);
}

// 在 onMounted 里追加:
onMounted(async () => { await regenerate(); await loadPhotos(); });

// 切平台时也要重载:改 platform 按钮的 @click:
// @click="platform = key; regenerate(); loadPhotos();"
```

在模板里"文案框"之后,"复制并打开"之前插入:

```vue
<div v-if="photos.length" class="space-y-2">
  <div class="text-sm text-gray-600">搭配照片(可选,最多 3 张)</div>
  <div class="grid grid-cols-5 gap-1">
    <div v-for="p in photos" :key="p.id"
      class="relative aspect-square cursor-pointer"
      @click="togglePhoto(p.id)">
      <img :src="p.url" class="w-full h-full object-cover rounded"/>
      <div v-if="selectedPhotos.includes(p.id)"
        class="absolute inset-0 bg-blue-500/30 border-2 border-blue-500 rounded flex items-center justify-center">
        <span class="bg-blue-500 text-white text-xs px-1 rounded">{{ selectedPhotos.indexOf(p.id) + 1 }}</span>
      </div>
    </div>
  </div>
  <p class="text-xs text-gray-500">提示:打开 App 后,文案会自动复制,图片请在 App 内长按下载或截图</p>
</div>
```

- [ ] **Step 3: 手动验证**

后台上传 3-5 张图(选 dianping 平台 + 5 星),再到顾客端 5 星流程上看到这些图;切换到小红书平台,看到不同的图。

- [ ] **Step 4: 提交**

```bash
git add apps/customer
git commit -m "feat(customer): photo picker on positive review page"
```

---


## Phase 5: 通知与二维码

目标:差评提交时推送企业微信群机器人;后台一键导出桌贴二维码 PNG。

### Task 5.1: 企业微信通知服务

**Files:**
- Create: `server/src/services/notification.ts`
- Create: `server/tests/services/notification.test.ts`

- [ ] **Step 1: 写测试**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notifyComplaint } from '../../src/services/notification.js';

describe('notifyComplaint', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('does nothing without webhook', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await notifyComplaint({
      webhookUrl: '',
      complaintId: 'c1', rating: 2, message: 'x',
      contact: null, adminUrl: 'http://x',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts a markdown message to webhook', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"errcode":0}', { status: 200 }),
    );
    await notifyComplaint({
      webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc',
      complaintId: 'c1', rating: 2, message: '太轻',
      contact: '13800001111', adminUrl: 'http://x/complaints',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body.msgtype).toBe('markdown');
    expect(body.markdown.content).toContain('太轻');
    expect(body.markdown.content).toContain('13800001111');
  });

  it('handles webhook failure gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    await expect(notifyComplaint({
      webhookUrl: 'https://x', complaintId: 'c1', rating: 1,
      message: 'x', contact: null, adminUrl: 'http://x',
    })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: 实现 `server/src/services/notification.ts`**

```typescript
interface NotifyInput {
  webhookUrl: string;
  complaintId: string;
  rating: number;
  message: string;
  contact: string | null;
  adminUrl: string;
}

export async function notifyComplaint(input: NotifyInput): Promise<void> {
  if (!input.webhookUrl) return;

  const stars = '★'.repeat(input.rating) + '☆'.repeat(5 - input.rating);
  const content = [
    '## 🔴 新差评待处理',
    `**评分**: ${stars} ${input.rating} 星`,
    `**留言**: ${input.message}`,
    input.contact ? `**联系**: ${input.contact}` : '',
    `[👉 点击进入后台处理](${input.adminUrl})`,
  ].filter(Boolean).join('\n\n');

  try {
    await fetch(input.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: { content },
      }),
    });
  } catch (err) {
    console.error('WeCom notify failed:', err);
  }
}
```

- [ ] **Step 3: 跑测试 + 提交**

```bash
pnpm test
git add server
git commit -m "feat(server): WeCom webhook notification service"
```

---

### Task 5.2: 接入差评提交流程

**Files:**
- Modify: `server/src/routes/customer.ts`

- [ ] **Step 1: 在 complaints handler 内追加通知调用**

修改 `server/src/routes/customer.ts` 的 `app.post('/complaints', ...)`:

```typescript
import { notifyComplaint } from '../services/notification.js';
import { env } from '../env.js';

// 在 INSERT 成功之后追加:
const config = db.prepare('SELECT wecom_webhook FROM store_config WHERE store_id=?')
  .get(session.store_id) as any;
const webhookUrl = config?.wecom_webhook ?? env.WECOM_WEBHOOK_URL ?? '';

notifyComplaint({
  webhookUrl,
  complaintId: id,
  rating: session.rating,
  message: parsed.data.message,
  contact: parsed.data.contact ?? null,
  adminUrl: `${c.req.url.replace(/\/api\/customer\/complaints$/, '')}/admin/#/complaints`,
}).catch(() => {});  // 不阻塞响应
```

- [ ] **Step 2: 写集成测试**

`server/tests/routes/customer.complaint.notify.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildCustomerRouter } from '../../src/routes/customer.js';

describe('complaint creation triggers webhook', () => {
  let app: ReturnType<typeof buildCustomerRouter>;
  let sessionId: string;

  beforeEach(async () => {
    process.env.WECOM_WEBHOOK_URL = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test';
    vi.restoreAllMocks();
    const db = openDb(':memory:');
    runMigrations(db);
    app = buildCustomerRouter(db);
    const r = await app.request('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: 's1' }),
    });
    sessionId = (await r.json()).sessionId;
    await app.request(`/sessions/${sessionId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 2 }),
    });
  });

  it('calls fetch when complaint is submitted', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 }),
    );
    await app.request('/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: 'test' }),
    });
    // 等待异步触发
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: 跑测试 + 提交**

```bash
pnpm test
git add server
git commit -m "feat(server): trigger WeCom webhook on complaint creation"
```

---

### Task 5.3: 配置接口 (设置 webhook 等)

**Files:**
- Create: `server/src/routes/config.ts`
- Create: `server/tests/routes/config.test.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: 写测试**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/db.js';
import { buildConfigRouter } from '../../src/routes/config.js';
import { signToken } from '../../src/services/auth.js';

const SECRET = 'test';

describe('admin/config', () => {
  let app: ReturnType<typeof buildConfigRouter>;
  let token: string;
  let db: ReturnType<typeof openDb>;

  beforeEach(async () => {
    db = openDb(':memory:');
    runMigrations(db);
    app = buildConfigRouter(db, SECRET);
    token = await signToken({ operatorId: 'op1', storeId: 's1' }, SECRET);
  });

  it('returns defaults when empty', async () => {
    const res = await app.request('/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.technicians).toEqual([]);
    expect(body.projects).toEqual([]);
  });

  it('saves and reads config', async () => {
    const payload = {
      name: '养发店',
      phone: '12345',
      address: '上海',
      technicians: ['小王', '小李'],
      projects: ['头皮检测'],
      platform_urls: { dianping: 'https://dianping.com/shop/123' },
      wecom_webhook: 'https://x',
    };
    await app.request('/', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const res = await app.request('/', { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    expect(body.name).toBe('养发店');
    expect(body.technicians).toEqual(['小王', '小李']);
  });
});
```

- [ ] **Step 2: 实现 `server/src/routes/config.ts`**

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import type { DB } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { logAction } from '../services/audit.js';

const configSchema = z.object({
  name: z.string().max(50).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(200).optional(),
  technicians: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
  platform_urls: z.record(z.string(), z.string()).default({}),
  wecom_webhook: z.string().optional(),
});

export function buildConfigRouter(db: DB, jwtSecret: string) {
  const app = new Hono();
  app.use('*', authMiddleware(jwtSecret));

  app.get('/', (c) => {
    const claims = c.get('claims' as any) as { storeId: string };
    const row = db.prepare('SELECT * FROM store_config WHERE store_id=?').get(claims.storeId) as any;
    if (!row) return c.json({
      name: '', phone: '', address: '',
      technicians: [], projects: [],
      platform_urls: {}, wecom_webhook: '',
    });
    return c.json({
      name: row.name ?? '',
      phone: row.phone ?? '',
      address: row.address ?? '',
      technicians: JSON.parse(row.technicians ?? '[]'),
      projects: JSON.parse(row.projects ?? '[]'),
      platform_urls: JSON.parse(row.platform_urls ?? '{}'),
      wecom_webhook: row.wecom_webhook ?? '',
    });
  });

  app.put('/', async (c) => {
    const claims = c.get('claims' as any) as { storeId: string; operatorId: string };
    const body = await c.req.json().catch(() => ({}));
    const parsed = configSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'bad_request', issues: parsed.error.issues }, 400);

    db.prepare(`INSERT INTO store_config
      (store_id, name, address, phone, platform_urls, wecom_webhook, technicians, projects, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(store_id) DO UPDATE SET
        name=excluded.name, address=excluded.address, phone=excluded.phone,
        platform_urls=excluded.platform_urls, wecom_webhook=excluded.wecom_webhook,
        technicians=excluded.technicians, projects=excluded.projects,
        updated_at=excluded.updated_at`,
    ).run(
      claims.storeId,
      parsed.data.name ?? null,
      parsed.data.address ?? null,
      parsed.data.phone ?? null,
      JSON.stringify(parsed.data.platform_urls),
      parsed.data.wecom_webhook ?? null,
      JSON.stringify(parsed.data.technicians),
      JSON.stringify(parsed.data.projects),
      Date.now(),
    );

    logAction(db, {
      operatorId: claims.operatorId,
      action: 'config_updated',
      targetType: 'store_config',
      targetId: claims.storeId,
    });

    return c.json({ ok: true });
  });

  return app;
}
```

- [ ] **Step 3: 挂到 main**

```typescript
import { buildConfigRouter } from './routes/config.js';
app.route('/api/admin/config', buildConfigRouter(db, env.JWT_SECRET));
```

- [ ] **Step 4: 跑测试 + 提交**

```bash
pnpm test
git add server
git commit -m "feat(server): store config CRUD endpoint"
```

---

### Task 5.4: 后台 - 设置页

**Files:**
- Modify: `apps/admin/src/api.ts`
- Create: `apps/admin/src/pages/Settings.vue`
- Modify: `apps/admin/src/router.ts`

- [ ] **Step 1: 扩展 api**

```typescript
getConfig: () =>
  http<any>('/admin/config'),
saveConfig: (data: any) =>
  http<{ ok: true }>('/admin/config', { method: 'PUT', body: JSON.stringify(data) }),
```

- [ ] **Step 2: 写 `apps/admin/src/pages/Settings.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api.js';

const cfg = ref<any>(null);
const saving = ref(false);
const techInput = ref('');
const projInput = ref('');

async function load() { cfg.value = await api.getConfig(); }

async function save() {
  saving.value = true;
  try {
    await api.saveConfig(cfg.value);
    alert('已保存');
  } finally { saving.value = false; }
}

function addTech() {
  if (techInput.value.trim()) {
    cfg.value.technicians.push(techInput.value.trim());
    techInput.value = '';
  }
}

function addProj() {
  if (projInput.value.trim()) {
    cfg.value.projects.push(projInput.value.trim());
    projInput.value = '';
  }
}

onMounted(load);
</script>

<template>
  <div v-if="cfg" class="p-4 max-w-md mx-auto space-y-4">
    <h1 class="text-xl font-bold">设置</h1>

    <section class="bg-white rounded p-3 space-y-2">
      <h2 class="font-semibold text-sm">门店信息</h2>
      <input v-model="cfg.name" placeholder="门店名称" class="w-full border rounded p-2 text-sm"/>
      <input v-model="cfg.phone" placeholder="电话" class="w-full border rounded p-2 text-sm"/>
      <input v-model="cfg.address" placeholder="地址" class="w-full border rounded p-2 text-sm"/>
    </section>

    <section class="bg-white rounded p-3">
      <h2 class="font-semibold text-sm mb-2">技师列表</h2>
      <div class="flex flex-wrap gap-1 mb-2">
        <span v-for="(t, i) in cfg.technicians" :key="i"
          class="px-2 py-1 bg-blue-50 rounded text-sm">
          {{ t }} <button @click="cfg.technicians.splice(i, 1)" class="text-red-500">×</button>
        </span>
      </div>
      <div class="flex gap-2">
        <input v-model="techInput" placeholder="新技师" class="flex-1 border rounded p-2 text-sm"/>
        <button @click="addTech" class="px-3 bg-blue-500 text-white rounded text-sm">+</button>
      </div>
    </section>

    <section class="bg-white rounded p-3">
      <h2 class="font-semibold text-sm mb-2">项目列表</h2>
      <div class="flex flex-wrap gap-1 mb-2">
        <span v-for="(p, i) in cfg.projects" :key="i"
          class="px-2 py-1 bg-green-50 rounded text-sm">
          {{ p }} <button @click="cfg.projects.splice(i, 1)" class="text-red-500">×</button>
        </span>
      </div>
      <div class="flex gap-2">
        <input v-model="projInput" placeholder="新项目" class="flex-1 border rounded p-2 text-sm"/>
        <button @click="addProj" class="px-3 bg-green-500 text-white rounded text-sm">+</button>
      </div>
    </section>

    <section class="bg-white rounded p-3 space-y-2">
      <h2 class="font-semibold text-sm">平台店铺链接(用于跳转)</h2>
      <input v-model="cfg.platform_urls.dianping" placeholder="大众点评店铺 URL"
        class="w-full border rounded p-2 text-sm"/>
      <input v-model="cfg.platform_urls.meituan" placeholder="美团店铺 URL"
        class="w-full border rounded p-2 text-sm"/>
      <input v-model="cfg.platform_urls.douyin" placeholder="抖音店铺 URL"
        class="w-full border rounded p-2 text-sm"/>
      <input v-model="cfg.platform_urls.xiaohongshu" placeholder="小红书店铺 URL"
        class="w-full border rounded p-2 text-sm"/>
    </section>

    <section class="bg-white rounded p-3">
      <h2 class="font-semibold text-sm mb-2">企业微信群机器人 Webhook</h2>
      <input v-model="cfg.wecom_webhook" placeholder="https://qyapi.weixin.qq.com/..."
        class="w-full border rounded p-2 text-sm"/>
      <p class="text-xs text-gray-500 mt-1">差评提交时自动推送到该群。从企业微信群「设置 → 群机器人」获取。</p>
    </section>

    <button @click="save" :disabled="saving"
      class="w-full bg-blue-600 disabled:bg-gray-300 text-white py-3 rounded">
      {{ saving ? '保存中...' : '保存设置' }}
    </button>
  </div>
</template>
```

- [ ] **Step 3: 加路由 + Dashboard 入口**

`apps/admin/src/router.ts`:
```typescript
import Settings from './pages/Settings.vue';
{ path: '/settings', component: Settings, meta: { requiresAuth: true } },
```

Dashboard 头部 nav 加按钮:
```vue
<button @click="router.push('/settings')" class="text-blue-500">设置</button>
```

- [ ] **Step 4: 提交**

```bash
git add apps/admin
git commit -m "feat(admin): settings page (store info, technicians, projects, webhook)"
```

---

### Task 5.5: 二维码生成

**Files:**
- Create: `server/src/services/qrcode.ts`
- Create: `server/src/routes/qrcode.ts`(挂在 admin 下)
- Create: `server/tests/services/qrcode.test.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: 加依赖**

```bash
cd /home/ubuntu/qsy/commentsys/server
pnpm add qrcode
pnpm add -D @types/qrcode
```

- [ ] **Step 2: 写测试**

```typescript
import { describe, it, expect } from 'vitest';
import { generateQrPng } from '../../src/services/qrcode.js';

describe('qrcode', () => {
  it('returns PNG buffer for a URL', async () => {
    const buf = await generateQrPng('https://example.com');
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });
});
```

- [ ] **Step 3: 实现 `server/src/services/qrcode.ts`**

```typescript
import QRCode from 'qrcode';

export async function generateQrPng(url: string): Promise<Buffer> {
  return await QRCode.toBuffer(url, {
    type: 'png',
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
}
```

- [ ] **Step 4: 写路由 `server/src/routes/qrcode.ts`**

```typescript
import { Hono } from 'hono';
import type { DB } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateQrPng } from '../services/qrcode.js';

export function buildQrcodeRouter(db: DB, jwtSecret: string, customerBaseUrl: string) {
  const app = new Hono();
  app.use('*', authMiddleware(jwtSecret));

  app.get('/png', async (c) => {
    const claims = c.get('claims' as any) as { storeId: string };
    const url = `${customerBaseUrl}/#/?s=${claims.storeId}`;
    const png = await generateQrPng(url);
    return new Response(png, {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Content-Disposition': 'inline; filename="qr.png"' },
    });
  });

  return app;
}
```

- [ ] **Step 5: 挂到 main**

```typescript
import { buildQrcodeRouter } from './routes/qrcode.js';

const CUSTOMER_BASE_URL = process.env.CUSTOMER_BASE_URL ?? 'http://localhost:5173';
app.route('/api/admin/qrcode', buildQrcodeRouter(db, env.JWT_SECRET, CUSTOMER_BASE_URL));
```

> 注意:`CUSTOMER_BASE_URL` 部署时改成真实顾客端域名。把它也加到 env.ts schema:

修改 `server/src/env.ts`:
```typescript
const schema = z.object({
  // ...existing
  CUSTOMER_BASE_URL: z.string().default('http://localhost:5173'),
});
```

并把上面的引用改成 `env.CUSTOMER_BASE_URL`。

- [ ] **Step 6: 跑测试 + 提交**

```bash
pnpm test
git add server
git commit -m "feat(server): QR code generation for table-sticker"
```

---

### Task 5.6: 后台 - 二维码导出页

**Files:**
- Create: `apps/admin/src/pages/QRCodeExport.vue`
- Modify: `apps/admin/src/router.ts`

- [ ] **Step 1: 写 `apps/admin/src/pages/QRCodeExport.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';

const imgUrl = ref('');

onMounted(async () => {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/admin/qrcode/png', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const blob = await res.blob();
  imgUrl.value = URL.createObjectURL(blob);
});

function downloadImg() {
  if (!imgUrl.value) return;
  const a = document.createElement('a');
  a.href = imgUrl.value;
  a.download = 'commentsys-qr.png';
  a.click();
}
</script>

<template>
  <div class="p-6 max-w-md mx-auto text-center">
    <h1 class="text-xl font-bold mb-4">桌贴二维码</h1>
    <div class="bg-white p-6 rounded mb-4 inline-block">
      <img v-if="imgUrl" :src="imgUrl" class="w-64 h-64"/>
      <div v-else class="w-64 h-64 flex items-center justify-center text-gray-400">生成中...</div>
    </div>
    <p class="text-sm text-gray-600 mb-4">
      下载后打印贴在桌面 / 收银台 / 镜前。建议尺寸不小于 5×5 cm。
    </p>
    <button @click="downloadImg" :disabled="!imgUrl"
      class="bg-blue-600 disabled:bg-gray-300 text-white px-6 py-2 rounded">
      下载 PNG
    </button>
  </div>
</template>
```

- [ ] **Step 2: 加路由 + Dashboard 入口**

`router.ts`:
```typescript
import QRCodeExport from './pages/QRCodeExport.vue';
{ path: '/qrcode', component: QRCodeExport, meta: { requiresAuth: true } },
```

Dashboard nav 加:
```vue
<button @click="router.push('/qrcode')" class="text-blue-500">二维码</button>
```

- [ ] **Step 3: 提交**

```bash
git add apps/admin
git commit -m "feat(admin): QR code download page"
```

---

## Phase 6: 抛光与部署

目标:解决微信内打开、剪贴板兼容、URL Scheme 跳转,完成部署最小可用。

### Task 6.1: 微信内打开检测与提示横幅

**Files:**
- Create: `apps/customer/src/utils/wechatGuard.ts`
- Create: `apps/customer/src/components/WeChatBanner.vue`
- Modify: `apps/customer/src/App.vue`

- [ ] **Step 1: 写 `apps/customer/src/utils/wechatGuard.ts`**

```typescript
export function isWeChatBrowser(): boolean {
  return /MicroMessenger/i.test(navigator.userAgent);
}

export function isDouyinBrowser(): boolean {
  return /aweme|bytedance/i.test(navigator.userAgent);
}

export function isInAppBrowser(): boolean {
  return isWeChatBrowser() || isDouyinBrowser();
}
```

- [ ] **Step 2: 写 `apps/customer/src/components/WeChatBanner.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { isInAppBrowser } from '../utils/wechatGuard.js';

const show = ref(isInAppBrowser());
</script>

<template>
  <div v-if="show" class="bg-yellow-100 border-b border-yellow-300 p-3 text-sm">
    <div class="flex items-center justify-between">
      <span>📱 为顺利发布评价,请点右上角 <b>···</b> → <b>在浏览器中打开</b></span>
      <button @click="show = false" class="text-yellow-600 ml-2">知道了</button>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 改 `apps/customer/src/App.vue`**

```vue
<script setup lang="ts">
import WeChatBanner from './components/WeChatBanner.vue';
</script>

<template>
  <main class="min-h-full bg-gray-50">
    <WeChatBanner />
    <RouterView />
  </main>
</template>
```

- [ ] **Step 4: 手动验证(在微信里打开 H5)**

- [ ] **Step 5: 提交**

```bash
git add apps/customer
git commit -m "feat(customer): in-app browser banner for WeChat/Douyin"
```

---

### Task 6.2: 剪贴板兼容与 URL Scheme 跳转

**Files:**
- Create: `apps/customer/src/utils/clipboard.ts`
- Create: `apps/customer/src/utils/appJump.ts`
- Modify: `apps/customer/src/pages/PositiveReview.vue`

- [ ] **Step 1: 写 `apps/customer/src/utils/clipboard.ts`**

```typescript
export async function copyText(text: string): Promise<boolean> {
  // 现代 API(HTTPS / localhost)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { /* fallthrough */ }
  }

  // 降级 textarea + execCommand
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  ta.readOnly = true;
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(ta);
  }
}
```

- [ ] **Step 2: 写 `apps/customer/src/utils/appJump.ts`**

```typescript
const SCHEMES: Record<string, { app: string; web: string }> = {
  dianping: {
    app: 'dianping://app',
    web: 'https://www.dianping.com/',
  },
  meituan: {
    app: 'imeituan://',
    web: 'https://i.meituan.com/',
  },
  douyin: {
    app: 'snssdk1128://',
    web: 'https://www.douyin.com/',
  },
  xiaohongshu: {
    app: 'xhsdiscover://',
    web: 'https://www.xiaohongshu.com/',
  },
};

export function jumpToApp(platform: string, fallbackUrl?: string): void {
  const config = SCHEMES[platform];
  if (!config) return;

  // 优先用店铺直链,再降级到 App 首页 scheme,最后到 Web
  const target = fallbackUrl || config.app;
  const fallback = fallbackUrl ? config.web : config.web;

  // 尝试拉起 App
  const start = Date.now();
  window.location.href = target;

  // 1.5 秒后如果还在原页,跳 Web
  setTimeout(() => {
    if (Date.now() - start < 2000 && document.visibilityState === 'visible') {
      window.location.href = fallback;
    }
  }, 1500);
}
```

- [ ] **Step 3: 改 PositiveReview.vue 用真工具替换 alert**

```typescript
import { copyText } from '../utils/clipboard.js';
import { jumpToApp } from '../utils/appJump.js';

const storeUrls = ref<Record<string, string>>({});

// onMounted 内追加(可选,如果后端配置已加载,这里读不到也没事):
//  把 platform_urls 通过新接口拉一下(为了简单 v1 暂用 hardcode 默认)

async function copyAndJump() {
  const ok = await copyText(text.value);
  if (!ok) {
    alert('请手动长按选中文案复制');
    return;
  }
  // 通知后端这次跳转
  fetch('/api/customer/reviews/log-jump', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: session.sessionId,
      platform: platform.value,
      tags: tags.value,
      technician: technician.value,
      photoIds: selectedPhotos.value,
      text: text.value,
    }),
  }).catch(() => {});

  jumpToApp(platform.value, storeUrls.value[platform.value]);
}
```

替换原来的 `copyAndJump` 函数。

- [ ] **Step 4: 后端加 log-jump 接口 — 修改 `server/src/routes/customer.ts`**

```typescript
const logJumpSchema = z.object({
  sessionId: z.string().uuid(),
  platform: z.enum(PLATFORMS),
  tags: z.array(z.string()).default([]),
  technician: z.string().default(''),
  photoIds: z.array(z.string()).default([]),
  text: z.string(),
});

app.post('/reviews/log-jump', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = logJumpSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'bad_request' }, 400);

  const session = db.prepare('SELECT store_id, rating FROM sessions WHERE id=?')
    .get(parsed.data.sessionId) as any;
  if (!session) return c.json({ error: 'session_not_found' }, 404);

  const id = randomUUID();
  db.prepare(`INSERT INTO reviews
    (id, session_id, store_id, rating, platform, project_tags, technician_id, edited_text, photo_ids, copied_at, jumped_to_app, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
  ).run(
    id,
    parsed.data.sessionId,
    session.store_id,
    session.rating,
    parsed.data.platform,
    JSON.stringify(parsed.data.tags),
    parsed.data.technician,
    parsed.data.text,
    JSON.stringify(parsed.data.photoIds),
    Date.now(),
    Date.now(),
  );

  // 累加照片 use_count
  if (parsed.data.photoIds.length) {
    const stmt = db.prepare('UPDATE photos SET use_count=use_count+1 WHERE id=?');
    parsed.data.photoIds.forEach((pid) => stmt.run(pid));
  }

  return c.json({ ok: true });
});
```

- [ ] **Step 5: 跑测试 + 提交**

```bash
pnpm test
git add server apps/customer
git commit -m "feat: log-jump endpoint + clipboard/scheme utilities"
```

---

### Task 6.3: 顾客端拉店铺链接配置

**Files:**
- Modify: `server/src/routes/customer.ts`
- Modify: `apps/customer/src/api.ts`
- Modify: `apps/customer/src/pages/PositiveReview.vue`

> 顾客端跳转需要店铺直链,从配置接口拉(开放给顾客端,不需要鉴权,但只暴露安全字段)。

- [ ] **Step 1: 后端加只读公共配置接口**

`server/src/routes/customer.ts` 追加:
```typescript
app.get('/config/:storeId', (c) => {
  const storeId = c.req.param('storeId');
  const row = db.prepare('SELECT name, platform_urls FROM store_config WHERE store_id=?')
    .get(storeId) as any;
  if (!row) return c.json({ name: '', platformUrls: {} });
  return c.json({
    name: row.name ?? '',
    platformUrls: JSON.parse(row.platform_urls ?? '{}'),
  });
});
```

- [ ] **Step 2: 扩展 customer api**

```typescript
getStoreConfig: (storeId: string) =>
  http<{ name: string; platformUrls: Record<string, string> }>(`/config/${storeId}`),
```

- [ ] **Step 3: 在 Welcome.vue 加载后,把配置塞 store**

`apps/customer/src/store/session.ts` 扩展 state:
```typescript
storeName: '' as string,
platformUrls: {} as Record<string, string>,
```

`Welcome.vue` onMounted 内追加:
```typescript
try {
  const cfg = await api.getStoreConfig(storeId);
  session.storeName = cfg.name;
  session.platformUrls = cfg.platformUrls;
} catch { /* ignore */ }
```

`PositiveReview.vue` 的 `copyAndJump` 用 `session.platformUrls[platform.value]` 替换 `storeUrls.value[platform.value]`,并删除 `storeUrls` 局部变量。

- [ ] **Step 4: 提交**

```bash
git add apps/customer server
git commit -m "feat: pass platform URLs from store config to customer"
```

---

### Task 6.4: 自检 - 端到端冒烟测试

**Files:**
- 无新文件,只是执行验证

- [ ] **Step 1: 启动整个栈**

```bash
# 终端 1
pnpm dev:server
# 终端 2
pnpm dev:customer
# 终端 3
pnpm dev:admin
```

- [ ] **Step 2: 初始化种子数据(SQL)**

```bash
sqlite3 /home/ubuntu/qsy/commentsys/server/data/commentsys.db <<SQL
INSERT INTO operators (id, store_id, phone, name, role, created_at)
VALUES ('op1', 'default-store', 'YOUR_OWNER_PHONE', '店主', 'owner', strftime('%s','now')*1000);
INSERT INTO operators (id, store_id, phone, name, role, created_at)
VALUES ('op2', 'default-store', 'YOUR_MANAGER_PHONE', '店长', 'manager', strftime('%s','now')*1000);
SQL
```

- [ ] **Step 3: 验证场景 1:店主登录 → 设置 → 上传图**

1. `http://localhost:5174/login` 用店主手机号登录
2. 进设置页,填门店名 / 技师列表 / 项目列表 / 4 个店铺 URL / 企微 webhook
3. 进照片库,上传 3-5 张图,选 dianping/meituan,5 星

- [ ] **Step 4: 验证场景 2:顾客 5 星流程**

1. `http://localhost:5173/#/?s=default-store` — 看到欢迎页 + 门店名
2. 点 5 星 → 公域评价页
3. 切换平台,文案 + 照片都换
4. 选标签 / 技师 → 点"换一条"文案变
5. 勾 2-3 张图
6. 点"复制并打开点评" — 浏览器 confirm 跳转
7. 回到 admin Dashboard,看到扫码数 +1、5 星 +1、点评跳转 +1

- [ ] **Step 5: 验证场景 3:顾客 2 星流程**

1. 新会话 `#/?s=default-store` → 2 星 → 差评页
2. 填问题 + 手机号 → 提交
3. 企微群应收到通知(若 webhook 已配)
4. admin /complaints 看到这条 → 标记已处理 → 切已处理标签能看到

- [ ] **Step 6: 验证场景 4:店长登录处理**

1. 用店长手机号登录,看到同样的 Dashboard 和差评中心
2. 处理一条 → 数据库 audit_logs 表里记录 operator_id = op2

- [ ] **Step 7: 全自动测试**

```bash
cd /home/ubuntu/qsy/commentsys
pnpm test
```

Expected: 全部 PASS

- [ ] **Step 8: 提交端到端测试小结(可写入 docs)**

```bash
git add .
git commit -m "chore: end-to-end smoke test pass"
```

---

### Task 6.5: 部署准备 - Docker + 部署文档

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `docs/deployment.md`

- [ ] **Step 1: 写 `Dockerfile`(单镜像跑后端 + 静态前端)**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY pnpm-workspace.yaml package.json ./
COPY server/package.json server/
COPY apps/customer/package.json apps/customer/
COPY apps/admin/package.json apps/admin/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter server build
RUN pnpm --filter customer build
RUN pnpm --filter admin build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache sqlite
RUN corepack enable

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/src/schema.sql ./server/dist/
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/apps/customer/dist ./public/customer
COPY --from=builder /app/apps/admin/dist ./public/admin
COPY --from=builder /app/seed-data ./seed-data

EXPOSE 8787
WORKDIR /app/server
CMD ["node", "dist/index.js"]
```

> 注意:静态站点需要 server 加路由 `app.use('/customer/*', ...)` 和 `app.use('/admin/*', ...)` 来 serve 静态文件。这需要在 Task 6.5 的 server/src/index.ts 改造里完成。

- [ ] **Step 2: 让 server 同时托管静态前端 — 改 `server/src/index.ts`**

```typescript
import { serveStatic } from '@hono/node-server/serve-static';

// 已有路由后追加:
app.use('/customer/*', serveStatic({ root: '../public', rewriteRequestPath: (p) => p.replace(/^\/customer/, '/customer') }));
app.use('/admin/*', serveStatic({ root: '../public', rewriteRequestPath: (p) => p.replace(/^\/admin/, '/admin') }));
app.get('/customer', (c) => c.redirect('/customer/index.html'));
app.get('/admin', (c) => c.redirect('/admin/index.html'));
```

> 部署后顾客端 URL: `https://yourdomain.com/customer/#/?s=default-store`
> 后台 URL: `https://yourdomain.com/admin/`

- [ ] **Step 3: 写 `docker-compose.yml`**

```yaml
services:
  commentsys:
    build: .
    ports:
      - "8787:8787"
    environment:
      NODE_ENV: production
      PORT: 8787
      DB_PATH: /data/commentsys.db
      JWT_SECRET: ${JWT_SECRET}
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
      WECOM_WEBHOOK_URL: ${WECOM_WEBHOOK_URL}
      CUSTOMER_BASE_URL: ${CUSTOMER_BASE_URL}
      ALIYUN_SMS_ACCESS_KEY: ${ALIYUN_SMS_ACCESS_KEY}
      ALIYUN_SMS_SECRET: ${ALIYUN_SMS_SECRET}
      ALIYUN_SMS_SIGN: ${ALIYUN_SMS_SIGN}
    volumes:
      - ./data:/data
    restart: unless-stopped
```

- [ ] **Step 4: 写 `docs/deployment.md`**

```markdown
# 部署指南

## 服务器要求
- 2C 4G 阿里云 ECS / 同类机器
- Ubuntu 22.04
- Docker + Docker Compose
- 一个备案过的域名(国内站点必须)

## 步骤

1. 安装 Docker
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

2. 克隆仓库到 `/opt/commentsys`

3. 准备 `.env`:
   ```
   JWT_SECRET=<32 字符随机串>
   DEEPSEEK_API_KEY=<去 platform.deepseek.com 申请>
   WECOM_WEBHOOK_URL=<企业微信群机器人 webhook>
   CUSTOMER_BASE_URL=https://yourdomain.com/customer
   ALIYUN_SMS_ACCESS_KEY=...
   ALIYUN_SMS_SECRET=...
   ALIYUN_SMS_SIGN=...
   ```

4. 启动
   ```bash
   docker compose up -d
   ```

5. Nginx / Caddy 反代 HTTPS 到 8787 端口。Caddyfile 示例:
   ```
   yourdomain.com {
       reverse_proxy localhost:8787
   }
   ```

6. 首次访问后,用 sqlite3 工具插入 operators 表的两条记录(店主 + 店长手机号)。

7. 浏览器打开 `https://yourdomain.com/admin/`,完成 4 步设置(店面信息、技师、项目、店铺链接、webhook)。

8. 后台「二维码」→ 下载 PNG → 印桌贴。
```

- [ ] **Step 5: 提交**

```bash
git add Dockerfile docker-compose.yml docs/deployment.md server apps
git commit -m "feat: Dockerfile + deployment docs + static hosting from server"
```

---

## Self-Review

### Spec coverage(对照 spec §4-§13 检查)

| Spec 章节 | 对应 Task | 状态 |
|---|---|---|
| §4.1 欢迎打分页 | 1.4 | ✅ |
| §4.2 公域评价生成页(平台/标签/技师/AI/照片/复制跳转) | 1.4, 1.7, 2.5, 4.5, 6.2 | ✅ |
| §4.3 差评留言页 | 1.5 | ✅ |
| §5 AI 文案策略(DeepSeek + 4 prompt + 防查重) | 2.1, 2.2 | ✅ |
| §6 模板池兜底 | 2.3, 2.4 | ✅ |
| §7 照片库(类型/元数据/推荐) | 4.1, 4.2, 4.3, 4.4 | ✅ |
| §8.1 登录(手机号+短信) | 3.1, 3.2, 3.3, 3.4, 3.5 | ✅ |
| §8.2 数据看板 | 3.6, 3.7 | ✅ |
| §8.3 差评中心 | 3.8, 3.9 | ✅ |
| §8.4 设置(技师/项目/平台URL/webhook) | 5.3, 5.4 | ✅ |
| §9 企微通知 | 5.1, 5.2 | ✅ |
| §10 技术架构 | 0.1-0.6 | ✅ |
| §11 微信内打开 / 剪贴板 | 6.1, 6.2 | ✅ |
| 桌贴二维码(§12.1) | 5.5, 5.6 | ✅ |
| 操作日志(§2.角色决策) | 3.10, 5.3 | ✅ |
| 部署 | 6.5 | ✅ |

### Placeholder scan

文档内无 "TBD" "TODO" 字样;每个 Step 都有实际代码或命令。

### Type consistency check

- `Platform` 类型在 `services/llm.ts` 定义,被 `prompts/*` 和 `routes/customer.ts` 共用 ✅
- `TokenClaims` 在 `services/auth.ts` 定义,middleware 和 routes 通过 `c.get('claims')` 取 ✅
- 顾客端 API client 和后端路由的请求/响应字段一一对应 ✅

无遗漏。

---

