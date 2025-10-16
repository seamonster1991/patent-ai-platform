// 매월 자동 포인트 지급 API
// 경로: /api/points/monthly-auto-grant
// 설명: 모든 사용자에게 매월 1,500포인트를 자동으로 지급하는 크론 작업용 API

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    // 보안을 위한 API 키 확인 (선택사항)
    const { apiKey } = req.body;
    const expectedApiKey = process.env.MONTHLY_GRANT_API_KEY;
    
    if (expectedApiKey && apiKey !== expectedApiKey) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Invalid API key.'
      });
    }

    console.log('[Monthly Auto Grant] 매월 자동 포인트 지급 시작...');

    // 모든 활성 사용자 조회 (최근 3개월 내 활동이 있는 사용자)
    const { data: activeUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()); // 3개월 전

    if (usersError) {
      console.error('[Monthly Auto Grant] 사용자 조회 실패:', usersError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
        details: usersError.message
      });
    }

    if (!activeUsers || activeUsers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No active users found',
        processed: 0,
        granted: 0,
        skipped: 0
      });
    }

    console.log(`[Monthly Auto Grant] ${activeUsers.length}명의 활성 사용자 발견`);

    let processedCount = 0;
    let grantedCount = 0;
    let skippedCount = 0;
    const results = [];

    // 각 사용자에게 월간 무료 포인트 지급 시도
    for (const user of activeUsers) {
      try {
        processedCount++;
        
        const { data, error } = await supabase
          .rpc('check_and_grant_monthly_free_points', {
            p_user_id: user.id
          });

        if (error) {
          console.error(`[Monthly Auto Grant] 사용자 ${user.email} 포인트 지급 실패:`, error);
          results.push({
            userId: user.id,
            email: user.email,
            success: false,
            error: error.message
          });
          skippedCount++;
          continue;
        }

        const result = data[0];
        
        if (result.granted) {
          grantedCount++;
          console.log(`[Monthly Auto Grant] 사용자 ${user.email}에게 ${result.points_amount}P 지급 완료`);
        } else {
          skippedCount++;
          console.log(`[Monthly Auto Grant] 사용자 ${user.email} 스킵: ${result.message}`);
        }

        results.push({
          userId: user.id,
          email: user.email,
          success: true,
          granted: result.granted,
          points: result.points_amount,
          message: result.message,
          expires_at: result.expires_at
        });

      } catch (userError) {
        console.error(`[Monthly Auto Grant] 사용자 ${user.email} 처리 중 오류:`, userError);
        results.push({
          userId: user.id,
          email: user.email,
          success: false,
          error: userError.message
        });
        skippedCount++;
      }
    }

    console.log(`[Monthly Auto Grant] 완료 - 처리: ${processedCount}, 지급: ${grantedCount}, 스킵: ${skippedCount}`);

    return res.status(200).json({
      success: true,
      message: 'Monthly auto grant completed',
      processed: processedCount,
      granted: grantedCount,
      skipped: skippedCount,
      timestamp: new Date().toISOString(),
      results: results
    });

  } catch (error) {
    console.error('[Monthly Auto Grant] 예상치 못한 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}