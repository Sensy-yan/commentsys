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
