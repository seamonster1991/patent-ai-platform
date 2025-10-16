// 회원가입 보너스 API
// 경로: /api/signup-bonus
// 설명: 신규 회원에게 5,000포인트 지급

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, action } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required',
        success: false 
      });
    }

    if (action !== 'signup-bonus') {
      return res.status(400).json({ 
        error: 'Invalid action',
        success: false 
      });
    }

    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({ 
        error: 'Invalid user ID format',
        success: false 
      });
    }

    // 회원가입 보너스 지급 함수 호출
    const { data, error } = await supabase.rpc('handle_signup_bonus', {
      p_user_id: userId
    });

    if (error) {
      console.error('Signup bonus error:', error);
      return res.status(500).json({ 
        error: 'Failed to grant signup bonus',
        details: error.message,
        success: false 
      });
    }

    // 응답 반환
    return res.status(200).json({
      success: data.success,
      granted: data.success,
      points: data.points,
      message: data.message,
      expires_at: data.expires_at
    });

  } catch (error) {
    console.error('Signup bonus API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      success: false 
    });
  }
}