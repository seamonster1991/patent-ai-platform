require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('환경 변수 확인:');
console.log('SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testUserActivities() {
  try {
    console.log('=== 사용자 활동 데이터 테스트 ===');
    
    // 1. 사용자 목록 조회
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('사용자 조회 오류:', usersError);
      return;
    }
    
    console.log('📊 총 사용자 수:', users.users.length);
    
    if (users.users.length === 0) {
      console.log('❌ 등록된 사용자가 없습니다.');
      return;
    }
    
    // 첫 번째 사용자 선택
    const testUser = users.users[0];
    console.log('🔍 테스트 사용자:', testUser.email, testUser.id);
    
    // 2. 해당 사용자의 활동 데이터 조회
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', testUser.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (activitiesError) {
      console.error('활동 데이터 조회 오류:', activitiesError);
      return;
    }
    
    console.log('📈 사용자 활동 데이터 수:', activities.length);
    
    if (activities.length === 0) {
      console.log('❌ 활동 데이터가 없습니다. 테스트 데이터를 생성합니다...');
      await createTestData(testUser.id);
    } else {
      console.log('✅ 활동 데이터가 존재합니다:');
      activities.forEach((activity, index) => {
        console.log(`${index + 1}. ${activity.activity_type} - ${activity.created_at}`);
        if (activity.activity_data) {
          console.log('   데이터:', JSON.stringify(activity.activity_data, null, 2));
        }
      });
    }
    
    // 3. API 테스트
    console.log('\n=== API 테스트 ===');
    const statsHandler = require('./api/users/stats.js');
    
    // Mock request/response 객체 생성
    const mockReq = {
      method: 'GET',
      query: {
        userId: testUser.id,
        period: '30'
      }
    };
    
    const mockRes = {
      setHeader: () => {},
      status: (code) => ({
        json: (data) => {
          console.log('📊 API 응답 상태:', code);
          console.log('📊 API 응답 데이터:', JSON.stringify(data, null, 2));
          return mockRes;
        },
        end: () => mockRes
      })
    };
    
    await statsHandler(mockReq, mockRes);
    
  } catch (error) {
    console.error('❌ 테스트 오류:', error);
  }
}

async function createTestData(userId) {
  try {
    console.log('🔧 테스트 데이터 생성 중...');
    
    const testActivities = [];
    const now = new Date();
    
    // 최근 30일간의 테스트 데이터 생성
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // 하루에 1-5개의 활동 생성
      const activitiesPerDay = Math.floor(Math.random() * 5) + 1;
      
      for (let j = 0; j < activitiesPerDay; j++) {
        const activityDate = new Date(date);
        activityDate.setHours(Math.floor(Math.random() * 24));
        activityDate.setMinutes(Math.floor(Math.random() * 60));
        
        const activityTypes = ['search', 'patent_view', 'ai_analysis', 'document_download'];
        const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        
        let activityData = {};
        
        switch (activityType) {
          case 'search':
            const keywords = ['인공지능', '블록체인', '자율주행', '바이오', '5G', '반도체', '태양광', '로봇'];
            activityData = {
              keyword: keywords[Math.floor(Math.random() * keywords.length)],
              results_count: Math.floor(Math.random() * 100) + 10
            };
            break;
          case 'patent_view':
            activityData = {
              application_number: `10-2023-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
              title: '특허 제목 예시'
            };
            break;
          case 'ai_analysis':
            activityData = {
              analysis_type: ['market_analysis', 'business_insight'][Math.floor(Math.random() * 2)],
              title: 'AI 분석 리포트'
            };
            break;
          case 'document_download':
            activityData = {
              document_type: ['publication', 'announcement', 'drawing'][Math.floor(Math.random() * 3)]
            };
            break;
        }
        
        testActivities.push({
          user_id: userId,
          activity_type: activityType,
          activity_data: activityData,
          created_at: activityDate.toISOString()
        });
      }
    }
    
    // 데이터 삽입
    const { data, error } = await supabase
      .from('user_activities')
      .insert(testActivities);
    
    if (error) {
      console.error('테스트 데이터 삽입 오류:', error);
      return;
    }
    
    console.log('✅ 테스트 데이터 생성 완료:', testActivities.length, '개');
    
  } catch (error) {
    console.error('❌ 테스트 데이터 생성 오류:', error);
  }
}

// 스크립트 실행
if (require.main === module) {
  testUserActivities();
}

module.exports = { testUserActivities, createTestData };