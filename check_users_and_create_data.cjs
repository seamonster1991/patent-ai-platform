const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Supabase 설정 (환경변수 사용)
const supabaseUrl = process.env.SUPABASE_URL || 'https://afzzubvlotobcaiflmia.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmenp1YnZsb3RvYmNhaWZsbWlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIzMzM2MiwiZXhwIjoyMDc0ODA5MzYyfQ.i7_KeTulGjmVaSB-MQftRLzha5EA9_yNkKI2-13PCJk'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkUsersAndCreateData() {
  console.log('🔍 사용자 확인 및 샘플 데이터 생성 시작...\n')
  
  try {
    // 1. 기존 사용자 확인
    console.log('👤 === 기존 사용자 확인 ===')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(10)
    
    if (usersError) {
      console.error('❌ 사용자 조회 오류:', usersError)
      return
    }
    
    console.log(`📊 총 사용자 수: ${users?.length || 0}`)
    users?.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.id})`)
    })
    
    let targetUserId = '550e8400-e29b-41d4-a716-446655440000'
    
    // 2. 테스트 사용자가 없으면 생성
    const testUser = users?.find(u => u.id === targetUserId)
    if (!testUser) {
      console.log('\n🔧 === 테스트 사용자 생성 ===')
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          id: targetUserId,
          email: 'test@example.com',
          name: '테스트 사용자',
          subscription_plan: 'premium',
          usage_count: 0,
          created_at: new Date().toISOString()
        }])
        .select()
      
      if (createError) {
        console.error('❌ 사용자 생성 오류:', createError)
        return
      }
      
      console.log('✅ 테스트 사용자 생성 완료')
    } else {
      console.log('✅ 테스트 사용자 존재 확인')
    }
    
    // 3. 검색 기록 샘플 데이터 생성
    console.log('\n🔍 === 검색 기록 샘플 데이터 생성 ===')
    
    const searchSamples = [
      {
        user_id: targetUserId,
        keyword: '인공지능 특허',
        technology_field: '인공지능',
        ipc_codes: ['G06N', 'G06F'],
        results_count: 150,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: targetUserId,
        keyword: '블록체인 암호화',
        technology_field: '블록체인',
        ipc_codes: ['H04L', 'G06F'],
        results_count: 89,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: targetUserId,
        keyword: '자율주행 센서',
        technology_field: '자동차',
        ipc_codes: ['B60W', 'G01S'],
        results_count: 234,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: targetUserId,
        keyword: '5G 통신',
        technology_field: '통신',
        ipc_codes: ['H04B', 'H04W'],
        results_count: 312,
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: targetUserId,
        keyword: '바이오 센서',
        technology_field: '바이오',
        ipc_codes: ['A61B', 'G01N'],
        results_count: 167,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
    
    const { data: searchData, error: searchError } = await supabase
      .from('search_history')
      .insert(searchSamples)
      .select()
    
    if (searchError) {
      console.error('❌ 검색 기록 생성 오류:', searchError)
    } else {
      console.log(`✅ 검색 기록 ${searchData?.length || 0}개 생성 완료`)
    }
    
    // 4. AI 분석 리포트 샘플 데이터 생성
    console.log('\n📊 === AI 분석 리포트 샘플 데이터 생성 ===')
    
    const reportSamples = [
      {
        user_id: targetUserId,
        invention_title: 'AI 기반 특허 분석 시스템',
        technology_field: '인공지능',
        ipc_codes: ['G06N', 'G06F'],
        application_number: 'US20240001001',
        analysis_type: 'market',
        market_penetration: '50억 달러 시장 규모, 15% 성장률',
        competitive_landscape: 'Google, Microsoft, IBM 등 주요 경쟁사',
        market_growth_drivers: 'AI 기술 발전, 자동화 수요 증가',
        risk_factors: '기술적 복잡성, 규제 리스크',
        revenue_model: '라이선스 및 SaaS 모델',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: targetUserId,
        invention_title: '블록체인 기반 보안 시스템',
        technology_field: '블록체인',
        ipc_codes: ['H04L', 'G06F'],
        application_number: 'US20240001002',
        analysis_type: 'technical',
        market_penetration: '30억 달러 시장 규모, 25% 성장률',
        competitive_landscape: 'Ethereum, Bitcoin, Ripple 등',
        market_growth_drivers: '보안 요구 증가, 탈중앙화 트렌드',
        risk_factors: '규제 불확실성, 기술적 한계',
        revenue_model: '토큰 이코노미 및 플랫폼 수수료',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: targetUserId,
        invention_title: '자율주행 차량 제어 시스템',
        technology_field: '자동차',
        ipc_codes: ['B60W', 'G01S'],
        application_number: 'US20240001003',
        analysis_type: 'market',
        market_penetration: '100억 달러 시장 규모, 20% 성장률',
        competitive_landscape: 'Tesla, Waymo, Uber 등 주요 플레이어',
        market_growth_drivers: '자율주행 기술 발전, 안전성 요구',
        risk_factors: '기술적 복잡성, 법적 책임 문제',
        revenue_model: '하드웨어 판매 및 소프트웨어 라이선스',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
    
    const { data: reportData, error: reportError } = await supabase
      .from('ai_analysis_reports')
      .insert(reportSamples)
      .select()
    
    if (reportError) {
      console.error('❌ AI 리포트 생성 오류:', reportError)
    } else {
      console.log(`✅ AI 리포트 ${reportData?.length || 0}개 생성 완료`)
    }
    
    // 5. 사용자 활동 샘플 데이터 생성
    console.log('\n📈 === 사용자 활동 샘플 데이터 생성 ===')
    
    const activitySamples = []
    
    // 최근 30일간의 활동 생성
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      
      // 로그인 활동
      activitySamples.push({
        user_id: targetUserId,
        activity_type: 'login',
        activity_data: { ip_address: '192.168.1.1', user_agent: 'Chrome' },
        created_at: new Date(date.getTime() + Math.random() * 8 * 60 * 60 * 1000).toISOString()
      })
      
      // 검색 활동 (랜덤하게)
      if (Math.random() > 0.3) {
        activitySamples.push({
          user_id: targetUserId,
          activity_type: 'search',
          activity_data: { keyword: `검색어${i}`, results_count: Math.floor(Math.random() * 200) + 50 },
          created_at: new Date(date.getTime() + Math.random() * 12 * 60 * 60 * 1000).toISOString()
        })
      }
      
      // 리포트 생성 활동 (가끔)
      if (Math.random() > 0.7) {
        activitySamples.push({
          user_id: targetUserId,
          activity_type: 'report_generation',
          activity_data: { report_type: 'market_analysis', processing_time: Math.floor(Math.random() * 30) + 10 },
          created_at: new Date(date.getTime() + Math.random() * 14 * 60 * 60 * 1000).toISOString()
        })
      }
    }
    
    const { data: activityData, error: activityError } = await supabase
      .from('user_activities')
      .insert(activitySamples)
      .select()
    
    if (activityError) {
      console.error('❌ 사용자 활동 생성 오류:', activityError)
    } else {
      console.log(`✅ 사용자 활동 ${activityData?.length || 0}개 생성 완료`)
    }
    
    // 6. 사용자 통계 업데이트
    console.log('\n👤 === 사용자 통계 업데이트 ===')
    
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({
        total_searches: searchSamples.length,
        total_reports: reportSamples.length,
        usage_count: reportSamples.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUserId)
      .select()
    
    if (updateError) {
      console.error('❌ 사용자 통계 업데이트 오류:', updateError)
    } else {
      console.log('✅ 사용자 통계 업데이트 완료')
    }
    
    console.log('\n🎉 === 샘플 데이터 생성 완료 ===')
    console.log('📊 생성된 데이터:')
    console.log(`   - 검색 기록: ${searchSamples.length}개`)
    console.log(`   - AI 리포트: ${reportSamples.length}개`)
    console.log(`   - 사용자 활동: ${activitySamples.length}개`)
    console.log('\n이제 대시보드를 새로고침하여 데이터를 확인해보세요!')
    
  } catch (error) {
    console.error('❌ 전체 프로세스 오류:', error)
  }
}

// 실행
checkUsersAndCreateData()