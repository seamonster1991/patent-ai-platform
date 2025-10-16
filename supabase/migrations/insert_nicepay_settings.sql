-- Insert NicePay configuration settings
INSERT INTO payment_settings (setting_key, setting_value, setting_type, description, is_active) VALUES
('nicepay_client_id', 'R2_6496fd66ebc242b58ab7ef1722c9a92b', 'string', 'NicePay Client ID for sandbox environment', true),
('nicepay_secret_key', '101d2ae924fa4ae398c3b76a7ba62226', 'string', 'NicePay Secret Key for sandbox environment', true),
('nicepay_api_url', 'https://sandbox-api.nicepay.co.kr/v1/payments', 'string', 'NicePay API URL for sandbox environment', true),
('nicepay_js_url', 'https://pay.nicepay.co.kr/v1/js/', 'string', 'NicePay JavaScript URL', true)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();