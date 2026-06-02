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
