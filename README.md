# 青丝瑶 · 扫码写评价系统

为单店养发/头皮管理门店打造的「扫码 → 写评价 → 跳转点评/美团/抖音/小红书」一体化系统。

- **顾客端**:扫码 3 分钟内写完一条公域好评 — AI 生成文案 + 内置照片 + 一键复制跳转
- **店主端**:看数据 / 处理差评 / 管照片库 / 改设置 / 下载桌贴二维码
- **核心模型**:**评价分流** — 4-5 星走公域写好评,1-3 星拦截在私域由店长补救

---

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Vue 3 · Vite · TypeScript · TailwindCSS · Vue Router · Pinia |
| 后端 | Node.js 20 · Hono · TypeScript · better-sqlite3 · Zod · jose (JWT) |
| 测试 | Vitest(53 个测试覆盖核心服务和接口) |
| LLM | DeepSeek-V3(可选,无 key 自动走模板池兜底) |
| 通知 | 企业微信群机器人 webhook |
| 短信 | 阿里云短信(dev 模式打日志) |
| 部署 | Docker + Docker Compose |

---

## 仓库结构

```
commentsys/
├── apps/
│   ├── customer/        顾客端 H5(扫码后的 4 屏流程)
│   └── admin/           店主/店长后台 H5
├── server/              后端 API
├── seed-data/templates/ 模板变量池(点评/美团/抖音/小红书 各 1 个 JSON)
├── docs/
│   ├── superpowers/specs/    设计文档
│   ├── superpowers/plans/    实施计划(44 task,5950 行)
│   └── deployment.md         部署指南
└── research/            竞品调研、品牌相关讨论
```

---

## 本地开发

### 前置

- Node.js 20+
- pnpm 9+

### 安装与启动

```bash
git clone git@github.com:Sensy-yan/commentsys.git
cd commentsys
pnpm install

# 三个终端分别跑(或后台启动)
pnpm dev:server      # API → :8787
pnpm dev:customer    # 顾客端 → :5173
pnpm dev:admin       # 后台 → :5174
```

### 测试账号

首次启动后,数据库是空的。插入测试操作员:

```bash
node -e "
const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/commentsys.db');
db.prepare(\"INSERT OR REPLACE INTO operators (id, store_id, phone, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)\")
  .run('op-owner', 'default-store', '13800001111', '店主', 'owner', Date.now());
db.prepare(\`INSERT OR REPLACE INTO store_config (store_id, name, technicians, projects, platform_urls, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)\`).run(
  'default-store', '青丝瑶',
  JSON.stringify(['小王','小李','小张']),
  JSON.stringify(['头皮检测','头皮排毒','防脱护理','中药养发','头皮 SPA','育发疗程']),
  '{}', Date.now());
"
```

### 访问

- 顾客端:`http://localhost:5173/#/?s=default-store`
- 店主后台:`http://localhost:5174/`(用 `13800001111` 一键登录)
- 健康检查:`http://localhost:8787/health`

> **开发模式跳过短信:** 后台 dev 环境自动启用 `POST /api/auth/dev-login`,手机号一步登录。`NODE_ENV=production` 时该入口自动 404。

### 测试

```bash
pnpm test             # 全部
pnpm --filter server test
```

---

## 顾客端流程

```
桌贴(NFC 或二维码)
        ↓
    扫码进入
        ↓
┌─────────────────┐
│ ① 欢迎 + 5 ★    │
│   默认 5 星     │
└─────────────────┘
        ↓
   ┌────┴────┐
 4-5 ★    1-3 ★
   ↓        ↓
┌──────┐  ┌──────────┐
│ 公域 │  │ 私域差评 │
│ 评价 │  │ 拦截     │
│ 生成 │  │          │
└──────┘  └──────────┘
   ↓        ↓
跳点评/    通知店主店长
美团/抖音/  (企业微信群机器人)
小红书
```

公域评价页:
- 默认平台 = 美团
- 4 平台分别有独立的 AI prompt(点评/美团 流水账;抖音 短句;小红书 emoji 种草)
- 一键复制 + URL Scheme 拉起 App
- 不重样:每次调 LLM 注入随机变量 + 模板池兜底

---

## 店主后台

- **数据看板**:扫码次数 / 评分分布 / 公域跳转 / 差评待处理
- **差评中心**:卡片列表,标记已处理 + 备注(留操作日志)
- **照片库**:上传 30-50 张真实店内图,按平台/星级打标签
- **设置**:门店信息 / 技师 / 项目 / 4 平台店铺 URL / 企微 webhook
- **二维码**:一键下载 PNG 桌贴

---

## 环境变量

`server/.env`(参考 `server/.env.example`):

| Key | 说明 |
|---|---|
| `NODE_ENV` | `development` / `production` |
| `PORT` | API 端口(默认 8787) |
| `DB_PATH` | SQLite 文件路径 |
| `JWT_SECRET` | **生产必须改**!默认是 dev 占位 |
| `CUSTOMER_BASE_URL` | 二维码编码的顾客端 URL |
| `DEEPSEEK_API_KEY` | DeepSeek 调用(无则走模板) |
| `WECOM_WEBHOOK_URL` | 企业微信群机器人 webhook |
| `ALIYUN_SMS_*` | 阿里云短信(dev 时不配则打日志) |

---

## 部署

详见 [`docs/deployment.md`](./docs/deployment.md)。

简版:

```bash
# 在服务器上
git clone git@github.com:Sensy-yan/commentsys.git
cd commentsys
cp server/.env.example .env  # 编辑填入生产 key
docker compose up -d
```

Caddy 反代示例:

```caddyfile
yourdomain.com {
    reverse_proxy localhost:8787
}
```

部署后访问:
- `https://yourdomain.com/customer/#/?s=default-store`
- `https://yourdomain.com/admin/`

---

## 设计原则

- **不重新发明轮子**:不抢平台流量,只往点评/抖音里送水
- **公域 > 私域**:顾客自建评价系统对获客直接价值小,自建系统的核心是**分流**
- **照片必须真实**:严禁网图,平台风控会按图片哈希查
- **AI + 模板池**:LLM 失败自动兜底,绝不让顾客看到错误
- **YAGNI**:v1 砍掉会员、多门店、漏斗分析,跑通核心闭环再加

---

## 路线图

✅ **v1**(已完成):基础闭环 + 4 平台 + 评价分流 + 照片库 + 通知 + 二维码

🚧 **v2 候选**(跑通后再加):
- 高级数据分析(漏斗、留存)
- 模板池可视化编辑器
- 顾客回访 / 复购召回
- 多门店 / 角色权限

🚫 **永远不做**:返现换好评 / 刷评 / 拓客盒子中间页

---

## License

私有项目。
