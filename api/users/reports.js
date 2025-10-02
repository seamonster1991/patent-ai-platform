const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId가 필요합니다.'
      });
    }

    if (req.method === 'GET') {
      // 리포트 조회
      console.log('📊 리포트 조회 API 호출:', { userId });

      const { data: reports, error } = await supabase
        .from('ai_analysis_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('리포트 조회 오류:', error);
        return res.status(500).json({
          success: false,
          error: '리포트 조회에 실패했습니다.'
        });
      }

      console.log('✅ 리포트 조회 성공:', reports?.length || 0, '개');

      return res.status(200).json({
        success: true,
        data: {
          reports: reports || []
        }
      });

    } else if (req.method === 'POST') {
      // 리포트 생성
      console.log('📊 리포트 생성 API 호출:', { userId, body: req.body });

      const { patent_id, analysis_type, analysis_data } = req.body;

      if (!patent_id || !analysis_type || !analysis_data) {
        return res.status(400).json({
          success: false,
          error: '필수 데이터가 누락되었습니다.'
        });
      }

      const { data: report, error } = await supabase
        .from('ai_analysis_reports')
        .insert([{
          user_id: userId,
          patent_id,
          analysis_type,
          analysis_data,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('리포트 생성 오류:', error);
        return res.status(500).json({
          success: false,
          error: '리포트 생성에 실패했습니다.'
        });
      }

      console.log('✅ 리포트 생성 성공:', report.id);

      return res.status(201).json({
        success: true,
        data: report
      });

    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('❌ 리포트 API 오류:', error);
    return res.status(500).json({
      success: false,
      error: '리포트 처리에 실패했습니다.'
    });
  }
}