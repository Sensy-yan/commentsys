# 青丝瑶 · 扫码写评价系统

为单店养发/头皮管理门店打造的「扫码 → 写评价 → 跳转点评/美团/抖音/小红书」一体化系统。

- **顾客端**:扫码 3 分钟内写完一条公域好评 — AI 生成文案 + 内置照片 + 一键复制跳转
- **店主端**:看数据 / 处理差评 / 看评价列表 / 管照片库 / 改设置 / 下载桌贴二维码
- **核心模型**:**评价分流** — 4-5 星走公域写好评,1-3 星拦截在私域由店长补救

## 线上地址

| 入口 | URL |
|---|---|
| 顾客端 | https://qsycommentsys.pages.dev/#/?s=default-store |
| 店主后台 | https://qsycommentsys.pages.dev/admin/ |

测试账号:店主 `13800001111` · 店长 `13800002222`(手机号一键登录)

---

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Vue 3 · Vite · TypeScript · TailwindCSS · Vue Router · Pinia |
| 后端 | Cloudflare Workers · Hono · TypeScript · Zod · jose (JWT) |
| 部署 | Cloudflare Pages(单 Worker + 静态资源 + D1 + Workers Assets) |
| 数据库 | Cloudflare D1(SQLite) |
| 照片存储 | D1 BLOB(无需 R2) |
| LLM | DeepSeek-V3(可选,无 key 自动走模板池兜底) |
| 通知 | 企业微信群机器人 webhook |
| 短信 | 阿里云短信(未配置时跳过,dev-login 兜底) |

**月成本**:$0(单店流量完全在 Cloudflare 免费额度内)

---

## 仓库结构

```
commentsys/
├── apps/
│   ├── customer/        顾客端 H5(扫码后的 4 屏流程)
│   └── admin/           店主/店长后台 H5
├── server/              Workers 后端(Hono + D1)
├── seed-data/templates/ 模板变量池(点评/美团/抖音/小红书 各 1 个 JSON)
├── public/              build 产物(gitignored)
├── wrangler.toml        Pages 部署配置
├── wrangler-build.toml  Worker bundle 配置(只用于打包 _worker.js)
└── docs/superpowers/    设计文档 + 实施计划
```

---

## 本地开发

### 前置

- Node.js 22+(必须,wrangler 4.x 要求)
- pnpm 9+

### 安装与启动

```bash
git clone git@github.com:Sensy-yan:commentsys.git
cd commentsys
pnpm install

# 初始化本地 D1(只第一次需要)
pnpm exec wrangler d1 execute qsycommetsys --local --command "$(node -e "import('./server/src/schema.ts').then(m=>console.log(m.SCHEMA))")"

# 三个终端
pnpm dev:server      # Workers + 本地 D1 → :8787
pnpm dev:customer    # 顾客端 → :5173
pnpm dev:admin       # 后台 → :5174
```

### 本地 secrets

`.dev.vars`(gitignored):

```
JWT_SECRET=local-dev-secret
CUSTOMER_BASE_URL=http://localhost:5173
```

### 本地访问

- 顾客端:`http://localhost:5173/#/?s=default-store`
- 店主后台:`http://localhost:5174/admin/`

---

## 顾客流程

```
桌贴(NFC 或二维码)
        ↓
    扫码进入
        ↓
┌─────────────────┐
│ ① 欢迎 + 5 ★    │  ← 默认 5 星,显示「青丝瑶」品牌
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
- 模板池兜底,LLM 失败用户无感

---

## 店主后台

- **数据看板**:扫码次数 / 评分分布 / 公域跳转 / 差评待处理
- **评价列表**:4-5 星好评记录(平台/技师筛选,点击复制文案)
- **差评中心**:1-3 星留言,标记已处理 + 备注(留操作日志)
- **照片库**:上传店内图,按平台/星级打标签,顾客端智能匹配
- **设置**:门店信息 / 技师 / 项目 / 4 平台店铺 URL / 企微 webhook
- **二维码**:一键下载 SVG 桌贴

---

## 部署

### 一键命令

```bash
pnpm run deploy
```

这条命令做了:
1. 构建顾客端 + 后台前端到 `public/`
2. 通过 wrangler 打包 worker.ts 为 `public/_worker.js`
3. 用 `wrangler pages deploy` 推到 `qsycommentsys.pages.dev`

### 首次部署(已完成)

1. 创建 D1:`wrangler d1 create qsycommetsys`,记下 database_id
2. 创建 Pages 项目:`wrangler pages project create qsycommentsys --production-branch main`
3. 配置 `nodejs_compat` + D1 binding + JWT_SECRET + CUSTOMER_BASE_URL(通过 Pages dashboard 或 API)
4. 部署 schema:`wrangler d1 execute qsycommetsys --remote --file=/tmp/schema.sql`
5. 插入 seed 数据:`wrangler d1 execute qsycommetsys --remote --file=/tmp/seed.sql`
6. `pnpm run deploy`

### 环境变量(在 Cloudflare Dashboard → Pages → 项目 → Settings 配置)

| Key | 类型 | 必需 | 说明 |
|---|---|---|---|
| `NODE_ENV` | plain | 是 | `development` 启用一键登录;`production` 强制 SMS |
| `JWT_SECRET` | secret | 是 | 32 字符随机串 |
| `CUSTOMER_BASE_URL` | plain | 是 | 二维码编码的顾客端 URL |
| `DEEPSEEK_API_KEY` | secret | 否 | 无则走模板池 |
| `WECOM_WEBHOOK_URL` | secret | 否 | 差评推送 |
| `ALIYUN_SMS_*` | secret | 否 | 生产模式 SMS 登录 |

---

## 设计原则

- **不重新发明轮子**:不抢平台流量,只往点评/抖音里送水
- **公域 > 私域**:顾客自建评价系统对获客直接价值小,核心是**分流**
- **照片必须真实**:严禁网图,平台风控会按图片哈希查
- **AI + 模板池**:LLM 失败自动兜底,绝不让顾客看到错误
- **YAGNI**:v1 砍掉会员、多门店、漏斗分析,跑通核心闭环再加

---

## 路线图

✅ **v1**(已完成):基础闭环 + 4 平台 + 评价分流 + 评价列表 + 照片库 + 通知 + 二维码 + Cloudflare 部署

🚧 **v2 候选**:
- 高级数据分析(漏斗、留存)
- 模板池可视化编辑器
- 顾客回访 / 复购召回
- 多门店 / 角色权限
- 自定义域名(`xxx.qingsiyao.com`)

🚫 **永远不做**:返现换好评 / 刷评 / 拓客盒子中间页

---

## License

私有项目。
