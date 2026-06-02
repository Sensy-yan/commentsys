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

3. 准备 `.env`(repo 根目录):

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

6. 首次访问后,用 sqlite3 工具插入 operators 表的两条记录(店主 + 店长手机号):

   ```bash
   docker compose exec commentsys sqlite3 /data/commentsys.db \
     "INSERT INTO operators (id, store_id, phone, name, role, created_at) VALUES ('op-owner', 'default-store', 'YOUR_PHONE', '店主', 'owner', strftime('%s','now')*1000);"
   ```

7. 浏览器打开 `https://yourdomain.com/admin/`,完成 4 步设置(店面信息、技师、项目、店铺链接、webhook)。

8. 后台「二维码」→ 下载 PNG → 印桌贴。

## URL 结构(部署后)
- 顾客端: `https://yourdomain.com/customer/#/?s=default-store`
- 店主后台: `https://yourdomain.com/admin/`
- API: `https://yourdomain.com/api/...`
- 上传图: `https://yourdomain.com/uploads/...`

## 数据持久化

`docker-compose.yml` 把 `./data` 挂载为容器内 `/data`。包含:
- `commentsys.db`(SQLite 数据库)
- `uploads/`(上传的照片)

定期备份 `./data` 目录即可。
