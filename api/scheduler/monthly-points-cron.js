// 월간 포인트 지급 스케줄러
// 매일 실행되어 월간 포인트 지급이 필요한 사용자를 확인하고 지급

import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 월간 포인트 지급 스케줄러 실행
async function runMonthlyPointsScheduler() {
  try {
    console.log('🔄 월간 포인트 지급 스케줄러 시작:', new Date().toISOString());

    // API 엔드포인트 호출
    const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3001'}/api/monthly-points?action=scheduler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-scheduler-key': process.env.SCHEDULER_SECRET_KEY || 'default-scheduler-key'
      }
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ 월간 포인트 지급 스케줄러 성공:', result.data);
      
      // 성공 로그 기록
      await supabase
        .from('user_activities')
        .insert({
          user_id: null, // 시스템 활동
          activity_type: 'monthly_point_scheduler_success',
          activity_data: {
            timestamp: new Date().toISOString(),
            result: result.data,
            status: 'success'
          }
        });

    } else {
      console.error('❌ 월간 포인트 지급 스케줄러 실패:', result);
      
      // 실패 로그 기록
      await supabase
        .from('user_activities')
        .insert({
          user_id: null, // 시스템 활동
          activity_type: 'monthly_point_scheduler_error',
          activity_data: {
            timestamp: new Date().toISOString(),
            error: result.error || 'Unknown error',
            details: result.details || null,
            status: 'error'
          }
        });
    }

  } catch (error) {
    console.error('💥 월간 포인트 지급 스케줄러 예외:', error);
    
    // 예외 로그 기록
    try {
      await supabase
        .from('user_activities')
        .insert({
          user_id: null, // 시스템 활동
          activity_type: 'monthly_point_scheduler_exception',
          activity_data: {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            status: 'exception'
          }
        });
    } catch (logError) {
      console.error('로그 기록 실패:', logError);
    }
  }
}

// 월간 포인트 지급 상태 확인
async function checkMonthlyPointsStatus() {
  try {
    const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3001'}/api/monthly-points?action=status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN || ''}`
      }
    });

    const result = await response.json();

    if (response.ok && result.success) {
      const status = result.data;
      console.log('📊 월간 포인트 지급 상태:', {
        grant_month: status.grant_month,
        total_eligible_users: status.total_eligible_users,
        granted_users: status.granted_users,
        pending_users: status.pending_users,
        completion_rate: status.completion_rate + '%'
      });

      // 미지급 사용자가 있으면 알림
      if (status.pending_users > 0) {
        console.log(`⚠️  ${status.pending_users}명의 사용자가 월간 포인트 지급 대기 중입니다.`);
      }

      return status;
    } else {
      console.error('월간 포인트 상태 확인 실패:', result);
      return null;
    }

  } catch (error) {
    console.error('월간 포인트 상태 확인 예외:', error);
    return null;
  }
}

// 스케줄러 설정
export function startMonthlyPointsScheduler() {
  console.log('🚀 월간 포인트 지급 스케줄러 시작');

  // 매일 오전 9시에 실행 (한국 시간 기준)
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ 월간 포인트 지급 스케줄러 실행 시간:', new Date().toISOString());
    await runMonthlyPointsScheduler();
  }, {
    scheduled: true,
    timezone: "Asia/Seoul"
  });

  // 매주 월요일 오전 10시에 상태 확인
  cron.schedule('0 10 * * 1', async () => {
    console.log('📊 월간 포인트 지급 상태 확인:', new Date().toISOString());
    await checkMonthlyPointsStatus();
  }, {
    scheduled: true,
    timezone: "Asia/Seoul"
  });

  // 서버 시작 시 즉시 한 번 실행 (테스트용)
  if (process.env.NODE_ENV === 'development') {
    setTimeout(async () => {
      console.log('🧪 개발 모드: 월간 포인트 지급 스케줄러 테스트 실행');
      await checkMonthlyPointsStatus();
    }, 5000); // 5초 후 실행
  }

  console.log('✅ 월간 포인트 지급 스케줄러 설정 완료');
  console.log('   - 매일 오전 9시: 월간 포인트 지급 실행');
  console.log('   - 매주 월요일 오전 10시: 상태 확인');
}

// 스케줄러 중지
export function stopMonthlyPointsScheduler() {
  cron.destroy();
  console.log('🛑 월간 포인트 지급 스케줄러 중지');
}

// 수동 실행 함수 (테스트용)
export async function runMonthlyPointsSchedulerManually() {
  console.log('🔧 수동 월간 포인트 지급 스케줄러 실행');
  await runMonthlyPointsScheduler();
}

// 수동 상태 확인 함수 (테스트용)
export async function checkMonthlyPointsStatusManually() {
  console.log('🔍 수동 월간 포인트 상태 확인');
  return await checkMonthlyPointsStatus();
}

// 기본 내보내기
export default {
  startMonthlyPointsScheduler,
  stopMonthlyPointsScheduler,
  runMonthlyPointsSchedulerManually,
  checkMonthlyPointsStatusManually
};