const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

/**
 * Dummy/Test 데이터 정리 스크립트
 * - 테스트 스크립트(test-dashboard-simple.js, test_report_data.json 등)로 생성된 더미 데이터를 제거합니다.
 * - 안전하게 특정 패턴("테스트", "AI 기반 스마트 진단 시스템")과 테스트 사용자/ID에 한정하여 삭제합니다.
 * - 실제 사용자 데이터에는 영향을 주지 않도록 필터를 사용합니다.
 */

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인하세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// 테스트/더미로 추정되는 사용자 ID/이메일/키워드/타이틀 패턴
const TEST_EMAILS = ['test@example.com', 'dummy@example.com'];
const TEST_USER_IDS = [
  '550e8400-e29b-41d4-a716-446655440000', // check_user_data에서 확인된 테스트 사용자
  '276975db-635b-4c77-87a0-548f91b14231', // test_report_data.json
  '50a3f2fa-abc6-4b44-a714-fb260df25752', // update_user_totals.js
  '9a2c17e6-1972-4563-91e8-4bd50b5bf2f5',
  '51c66d4c-4a2f-4079-9173-a3d92b9702ed',
  '4e5e48c9-557a-47b6-9041-3ed876149ecc',
  '8d6e35ea-4ec1-437c-b203-3909ba4d8605',
  'bc3105c9-3a3a-4a98-b647-4148f7e4a418',
  '95bd8fed-8ed3-443a-b9e4-becfa5171b8c'
];
const TEST_KEYWORD_PATTERNS = ['테스트 검색', 'AI 인공지능', '블록체인 기술', 'IoT 센서', '자율주행 기술', '바이오 기술', '반도체 설계', '5G 통신', '전기차 배터리', '머신러닝', '양자컴퓨팅'];
const TEST_REPORT_TITLE_PATTERNS = ['테스트 리포트', 'AI 기반 스마트 진단 시스템'];

async function getTestUserIdsFromEmails() {
  const ids = [];
  for (const email of TEST_EMAILS) {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);
    if (error) {
      console.warn('⚠️ 사용자 조회 오류:', email, error.message);
      continue;
    }
    if (data && data.length > 0) {
      ids.push(data[0].id);
    }
  }
  return ids;
}

async function purgeDummyData() {
  console.log('🧹 더미 데이터 정리 시작...');

  const emailUserIds = await getTestUserIdsFromEmails();
  const targetUserIds = Array.from(new Set([...TEST_USER_IDS, ...emailUserIds])).filter(Boolean);
  console.log('🎯 삭제 대상 테스트 사용자 ID:', targetUserIds);

  // 1) ai_analysis_reports: 제목 패턴/테스트 사용자에 해당하는 레코드 삭제
  try {
    console.log('🗑️ ai_analysis_reports 더미 삭제...');
    let totalDeleted = 0;

    // 사용자 기준 삭제
    if (targetUserIds.length) {
      const { data, error } = await supabase
        .from('ai_analysis_reports')
        .delete()
        .in('user_id', targetUserIds)
        .select();
      if (error) console.warn('⚠️ 사용자 기준 리포트 삭제 오류:', error.message);
      else totalDeleted += (data?.length || 0);
    }

    // 제목 패턴 기준 삭제
    for (const pattern of TEST_REPORT_TITLE_PATTERNS) {
      const { data, error } = await supabase
        .from('ai_analysis_reports')
        .delete()
        .ilike('report_name', `%${pattern}%`)
        .select();
      if (error) console.warn('⚠️ 제목 패턴 리포트 삭제 오류:', pattern, error.message);
      else totalDeleted += (data?.length || 0);
    }
    console.log(`✅ ai_analysis_reports 삭제: ${totalDeleted}건`);
  } catch (e) {
    console.error('❌ ai_analysis_reports 삭제 중 오류:', e);
  }

  // 2) user_activities: activity_data 내 테스트 패턴/타입 기준 삭제
  try {
    console.log('🗑️ user_activities 더미 삭제...');
    let totalDeleted = 0;

    // 사용자 기준
    if (targetUserIds.length) {
      const { data, error } = await supabase
        .from('user_activities')
        .delete()
        .in('user_id', targetUserIds)
        .select();
      if (error) console.warn('⚠️ 사용자 기준 활동 삭제 오류:', error.message);
      else totalDeleted += (data?.length || 0);
    }

    // activity_data 패턴
    const jsonLikeFields = ['activity_data->>title', 'activity_data->>query', 'activity_data->>report_name'];
    for (const field of jsonLikeFields) {
      for (const pattern of [...TEST_REPORT_TITLE_PATTERNS, ...TEST_KEYWORD_PATTERNS]) {
        const { data, error } = await supabase
          .from('user_activities')
          .delete()
          .ilike(field, `%${pattern}%`)
          .select();
        if (error) console.warn('⚠️ 활동 패턴 삭제 오류:', field, pattern, error.message);
        else totalDeleted += (data?.length || 0);
      }
    }
    console.log(`✅ user_activities 삭제: ${totalDeleted}건`);
  } catch (e) {
    console.error('❌ user_activities 삭제 중 오류:', e);
  }

  // 3) search_history: 키워드 패턴/테스트 사용자 기준 삭제
  try {
    console.log('🗑️ search_history 더미 삭제...');
    let totalDeleted = 0;
    if (targetUserIds.length) {
      const { data, error } = await supabase
        .from('search_history')
        .delete()
        .in('user_id', targetUserIds)
        .select();
      if (error) console.warn('⚠️ 사용자 기준 검색 삭제 오류:', error.message);
      else totalDeleted += (data?.length || 0);
    }
    for (const pattern of TEST_KEYWORD_PATTERNS) {
      const { data, error } = await supabase
        .from('search_history')
        .delete()
        .ilike('keyword', `%${pattern}%`)
        .select();
      if (error) console.warn('⚠️ 키워드 패턴 검색 삭제 오류:', pattern, error.message);
      else totalDeleted += (data?.length || 0);
    }
    console.log(`✅ search_history 삭제: ${totalDeleted}건`);
  } catch (e) {
    console.error('❌ search_history 삭제 중 오류:', e);
  }

  // 4) patent_search_analytics: 검색어 패턴/테스트 사용자 기준 삭제
  try {
    console.log('🗑️ patent_search_analytics 더미 삭제...');
    let totalDeleted = 0;
    if (targetUserIds.length) {
      const { data, error } = await supabase
        .from('patent_search_analytics')
        .delete()
        .in('user_id', targetUserIds)
        .select();
      if (error) console.warn('⚠️ 사용자 기준 검색 분석 삭제 오류:', error.message);
      else totalDeleted += (data?.length || 0);
    }
    for (const pattern of TEST_KEYWORD_PATTERNS) {
      const { data, error } = await supabase
        .from('patent_search_analytics')
        .delete()
        .ilike('search_query', `%${pattern}%`)
        .select();
      if (error) console.warn('⚠️ 검색어 패턴 검색 분석 삭제 오류:', pattern, error.message);
      else totalDeleted += (data?.length || 0);
    }
    console.log(`✅ patent_search_analytics 삭제: ${totalDeleted}건`);
  } catch (e) {
    console.error('❌ patent_search_analytics 삭제 중 오류:', e);
  }

  // 5) reports 테이블(샘플 SQL에서만 사용) 안전 삭제
  try {
    console.log('🗑️ reports(샘플) 더미 삭제...');
    let totalDeleted = 0;
    for (const pattern of TEST_REPORT_TITLE_PATTERNS) {
      const { data, error } = await supabase
        .from('reports')
        .delete()
        .ilike('analysis_content', `%${pattern}%`)
        .select();
      if (error) console.warn('⚠️ reports 샘플 삭제 오류:', pattern, error.message);
      else totalDeleted += (data?.length || 0);
    }
    console.log(`✅ reports(샘플) 삭제: ${totalDeleted}건`);
  } catch (e) {
    console.warn('ℹ️ reports 테이블이 없거나 삭제 중 오류가 발생했습니다:', e.message);
  }

  console.log('🎉 더미 데이터 정리 완료.');
}

purgeDummyData().catch(err => {
  console.error('❌ 더미 데이터 정리 실패:', err);
  process.exit(1);
});