require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://afzzubvlotobcaiflmia.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmenp1YnZsb3RvYmNhaWZsbWlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIzMzM2MiwiZXhwIjoyMDc0ODA5MzYyfQ.i7_KeTulGjmVaSB-MQftRLzha5EA9_yNkKI2-13PCJk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseData() {
    console.log('=== 데이터베이스 저장 상태 확인 ===\n');

    try {
        // 1. user_activities 테이블 확인
        console.log('1. user_activities 테이블 확인:');
        const { data: userActivities, error: userActivitiesError } = await supabase
            .from('user_activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (userActivitiesError) {
            console.error('user_activities 조회 오류:', userActivitiesError);
        } else {
            console.log(`총 ${userActivities.length}개의 활동 기록 발견`);
            userActivities.forEach((activity, index) => {
                console.log(`  ${index + 1}. ID: ${activity.id}, 타입: ${activity.activity_type}, 생성일: ${activity.created_at}`);
                if (activity.activity_data) {
                    const data = typeof activity.activity_data === 'string' ? JSON.parse(activity.activity_data) : activity.activity_data;
                    console.log(`     데이터: ${JSON.stringify(data).substring(0, 100)}...`);
                }
            });
        }

        console.log('\n2. patent_search_analytics 테이블 확인:');
        const { data: searchAnalytics, error: searchAnalyticsError } = await supabase
            .from('patent_search_analytics')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (searchAnalyticsError) {
            console.error('patent_search_analytics 조회 오류:', searchAnalyticsError);
        } else {
            console.log(`총 ${searchAnalytics.length}개의 검색 분석 기록 발견`);
            searchAnalytics.forEach((search, index) => {
                console.log(`  ${index + 1}. ID: ${search.id}, 검색어: "${search.search_query}", 결과 수: ${search.results_count}, 생성일: ${search.created_at}`);
                if (search.search_metadata) {
                    const metadata = typeof search.search_metadata === 'string' ? JSON.parse(search.search_metadata) : search.search_metadata;
                    console.log(`     메타데이터: ${JSON.stringify(metadata).substring(0, 100)}...`);
                }
            });
        }

        console.log('\n3. ai_analysis_reports 테이블 확인:');
        const { data: reports, error: reportsError } = await supabase
            .from('ai_analysis_reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (reportsError) {
            console.error('ai_analysis_reports 조회 오류:', reportsError);
        } else {
            console.log(`총 ${reports.length}개의 AI 분석 리포트 발견`);
            reports.forEach((report, index) => {
                console.log(`  ${index + 1}. ID: ${report.id}, 리포트명: "${report.report_name}", 타입: ${report.report_type}, 생성일: ${report.created_at}`);
                if (report.report_data) {
                    const data = typeof report.report_data === 'string' ? JSON.parse(report.report_data) : report.report_data;
                    console.log(`     섹션 수: ${data.sections ? data.sections.length : 'N/A'}`);
                }
            });
        }

        // 4. 사용자별 통계
        console.log('\n4. 사용자별 활동 통계:');
        const { data: userStats, error: userStatsError } = await supabase
            .from('user_activities')
            .select('user_id, activity_type')
            .order('user_id');

        if (!userStatsError && userStats) {
            const stats = {};
            userStats.forEach(activity => {
                if (!stats[activity.user_id]) {
                    stats[activity.user_id] = {};
                }
                if (!stats[activity.user_id][activity.activity_type]) {
                    stats[activity.user_id][activity.activity_type] = 0;
                }
                stats[activity.user_id][activity.activity_type]++;
            });

            Object.keys(stats).forEach(userId => {
                console.log(`  사용자 ${userId}:`);
                Object.keys(stats[userId]).forEach(activityType => {
                    console.log(`    ${activityType}: ${stats[userId][activityType]}회`);
                });
            });
        }

        console.log('\n=== 데이터베이스 확인 완료 ===');

    } catch (error) {
        console.error('데이터베이스 확인 중 오류 발생:', error);
    }
}

checkDatabaseData();