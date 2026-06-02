export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  DEEPSEEK_API_KEY?: string;
  WECOM_WEBHOOK_URL?: string;
  ALIYUN_SMS_ACCESS_KEY?: string;
  ALIYUN_SMS_SECRET?: string;
  ALIYUN_SMS_SIGN?: string;
  CUSTOMER_BASE_URL?: string;
  NODE_ENV?: string;
}

export interface Variables {
  claims: { operatorId: string; storeId: string };
}
