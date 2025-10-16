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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { userId, action } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      if (action === 'signup-bonus') {
        // 신규 가입 보너스 지급 (3,000P, 3개월 만료)
        const { data, error } = await supabase
          .rpc('grant_signup_bonus', {
            p_user_id: userId
          });

        if (error) {
          console.error('Error granting signup bonus:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to grant signup bonus'
          });
        }

        const result = data[0];
        
        return res.status(200).json({
          success: true,
          granted: result.granted,
          points: result.points_amount,
          message: result.message,
          expires_at: result.expires_at
        });
      } else {
        // 월간 무료 포인트 지급 (1,500P, 1개월 만료)
        const { data, error } = await supabase
          .rpc('check_and_grant_monthly_free_points', {
            p_user_id: userId
          });

        if (error) {
          console.error('Error granting monthly free points:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to grant monthly free points'
          });
        }

        const result = data[0];
        
        return res.status(200).json({
          success: true,
          granted: result.granted,
          points: result.points_amount,
          message: result.message,
          expires_at: result.expires_at
        });
      }

    } catch (error) {
      console.error('Error in monthly free points API:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  if (req.method === 'GET') {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      // 포인트 지급 통계 조회
      const { data, error } = await supabase
        .rpc('get_point_grant_stats', {
          p_user_id: userId
        });

      if (error) {
        console.error('Error getting point grant stats:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to get point grant stats'
        });
      }

      const stats = data[0];
      
      return res.status(200).json({
        success: true,
        stats: {
          signupBonusGranted: stats.signup_bonus_granted,
          signupBonusDate: stats.signup_bonus_date,
          totalMonthlyGrants: stats.total_monthly_grants,
          totalPointsGranted: stats.total_points_granted,
          currentMonthGranted: stats.current_month_granted,
          nextGrantDate: stats.next_grant_date,
          expiringPoints: stats.expiring_points,
          expiringDate: stats.expiring_date
        }
      });

    } catch (error) {
      console.error('Error in point grant stats API:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}