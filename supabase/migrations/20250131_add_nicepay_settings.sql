-- NicePay 결제 설정 추가
-- 생성일: 2025-01-31
-- 설명: NicePay 결제 시스템 설정 정보를 payment_settings 테이블에 추가

-- NicePay 설정 정보 삽입
INSERT INTO payment_settings (setting_key, setting_value, setting_type, description, is_active) VALUES
('nicepay_client_id', 'R2_6496fd66ebc242b58ab7ef1722c9a92b', 'string', 'NicePay 클라이언트 ID (샌드박스)', true),
('nicepay_secret_key', '101d2ae924fa4ae398c3b76a7ba62226', 'string', 'NicePay 시크릿 키 (샌드박스)', true),
('nicepay_api_url', 'https://sandbox-api.nicepay.co.kr/v1/payments', 'string', 'NicePay API URL (샌드박스)', true),
('nicepay_js_url', 'https://pay.nicepay.co.kr/v1/js/', 'string', 'NicePay JavaScript SDK URL', true),
('nicepay_environment', 'sandbox', 'string', 'NicePay 환경 설정 (sandbox/production)', true)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();

-- 결제 관련 기본 설정 추가
INSERT INTO payment_settings (setting_key, setting_value, setting_type, description, is_active) VALUES
('payment_enabled', 'true', 'boolean', '결제 시스템 활성화 여부', true),
('payment_min_amount', '1000', 'number', '최소 결제 금액 (KRW)', true),
('payment_max_amount', '10000000', 'number', '최대 결제 금액 (KRW)', true),
('payment_timeout', '300', 'number', '결제 타임아웃 (초)', true),
('points_per_krw', '1', 'number', '1원당 포인트 비율', true)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();