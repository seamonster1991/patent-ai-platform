-- 전화번호 형식 검증 제약조건 추가
-- 000-0000-0000 형식으로 제한

-- 기존 제약조건이 있다면 삭제
ALTER TABLE users DROP CONSTRAINT IF EXISTS phone_format_check;

-- 새로운 전화번호 형식 제약조건 추가
ALTER TABLE users 
ADD CONSTRAINT phone_format_check 
CHECK (phone IS NULL OR phone ~ '^[0-9]{3}-[0-9]{4}-[0-9]{4}$');

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- RLS 정책 업데이트 (사용자는 자신의 정보만 수정 가능)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;

-- 사용자는 자신의 정보만 조회/수정 가능
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 관리자는 모든 사용자 정보 조회 가능
CREATE POLICY "Admin can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- 관리자는 다른 사용자 정보 수정 가능
CREATE POLICY "Admin can update all users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- 새 사용자 등록 허용 (기존 정책이 있다면 삭제 후 재생성)
DROP POLICY IF EXISTS "Allow user registration" ON users;
CREATE POLICY "Allow user registration" ON users
  FOR INSERT WITH CHECK (true);