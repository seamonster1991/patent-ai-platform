const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addPayMethodColumn() {
  try {
    console.log('pay_method 컬럼 추가 시도 중...');
    
    // 직접 SQL 실행을 위한 함수 생성
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payment_orders' AND column_name = 'pay_method'
          ) THEN
            ALTER TABLE payment_orders 
            ADD COLUMN pay_method TEXT DEFAULT 'card' 
            CHECK (pay_method IN ('card', 'kakaopay', 'naverpay', 'bank'));
            
            COMMENT ON COLUMN payment_orders.pay_method IS 'Payment method used for the order';
            
            UPDATE payment_orders 
            SET pay_method = 'card' 
            WHERE pay_method IS NULL;
            
            ALTER TABLE payment_orders 
            ALTER COLUMN pay_method SET NOT NULL;
            
            RAISE NOTICE 'pay_method 컬럼이 성공적으로 추가되었습니다.';
          ELSE
            RAISE NOTICE 'pay_method 컬럼이 이미 존재합니다.';
          END IF;
        END
        $$;
      `
    });
    
    if (error) {
      console.log('RPC 함수가 없습니다. 다른 방법을 시도합니다...');
      
      // 테이블 정보 확인
      const { data: tableInfo, error: tableError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'payment_orders');
      
      if (tableError) {
        console.log('테이블 정보 확인 오류:', tableError.message);
      } else {
        console.log('현재 테이블 컬럼들:', tableInfo.map(col => col.column_name));
      }
    } else {
      console.log('✅ SQL 실행 성공:', data);
    }
    
    // 결과 확인
    const { data: testData, error: testError } = await supabase
      .from('payment_orders')
      .select('*')
      .limit(1);
    
    if (testData && testData.length > 0) {
      console.log('현재 테이블 컬럼들:');
      console.log(Object.keys(testData[0]));
      
      if ('pay_method' in testData[0]) {
        console.log('✅ pay_method 컬럼이 존재합니다.');
      } else {
        console.log('❌ pay_method 컬럼이 여전히 없습니다.');
      }
    } else {
      console.log('테이블에 데이터가 없습니다.');
    }
    
  } catch (err) {
    console.error('오류:', err.message);
  }
}

addPayMethodColumn();