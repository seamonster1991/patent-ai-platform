const { createClient } = require('@supabase/supabase-js');

// 환경변수 로드
require('dotenv').config();

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ [bookmarks.js] Supabase 클라이언트 초기화 성공');
  } else {
    console.warn('⚠️ [bookmarks.js] Supabase 환경변수 누락:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });
  }
} catch (error) {
  console.error('❌ [bookmarks.js] Supabase 클라이언트 초기화 실패:', error.message);
  supabase = null;
}

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  try {
    const { userId, applicationNumber, patentTitle, applicantName, applicationDate } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (req.method === 'POST') {
      // 북마크 추가
      if (!applicationNumber) {
        return res.status(400).json({
          success: false,
          error: 'Application number is required'
        });
      }

      // 이미 북마크되어 있는지 확인
      const { data: existing } = await supabase
        .from('saved_patents')
        .select('id')
        .eq('user_id', userId)
        .eq('patent_application_number', applicationNumber)
        .single();

      if (existing) {
        return res.status(200).json({
          success: true,
          message: '이미 북마크에 추가된 특허입니다.',
          data: { id: existing.id, isBookmarked: true }
        });
      }

      // 북마크 추가
      const { data, error } = await supabase
        .from('saved_patents')
        .insert({
          user_id: userId,
          patent_application_number: applicationNumber,
          patent_title: patentTitle,
          applicant_name: applicantName,
          application_date: applicationDate
        })
        .select()
        .single();

      if (error) {
        console.error('❌ 북마크 추가 실패:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to add bookmark'
        });
      }

      return res.status(200).json({
        success: true,
        message: '북마크에 추가되었습니다.',
        data: { id: data.id, isBookmarked: true }
      });

    } else if (req.method === 'DELETE') {
      // 북마크 제거
      if (!applicationNumber) {
        return res.status(400).json({
          success: false,
          error: 'Application number is required'
        });
      }

      const { error } = await supabase
        .from('saved_patents')
        .delete()
        .eq('user_id', userId)
        .eq('patent_application_number', applicationNumber);

      if (error) {
        console.error('❌ 북마크 제거 실패:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to remove bookmark'
        });
      }

      return res.status(200).json({
        success: true,
        message: '북마크에서 제거되었습니다.',
        data: { isBookmarked: false }
      });

    } else if (req.method === 'GET') {
      // 북마크 상태 확인 또는 북마크 목록 조회
      const { applicationNumber } = req.query;

      if (applicationNumber) {
        // 특정 특허의 북마크 상태 확인
        const { data } = await supabase
          .from('saved_patents')
          .select('id')
          .eq('user_id', userId)
          .eq('patent_application_number', applicationNumber)
          .single();

        return res.status(200).json({
          success: true,
          data: { isBookmarked: !!data }
        });
      } else {
        // 사용자의 모든 북마크 조회
        const { data, error } = await supabase
          .from('saved_patents')
          .select('*')
          .eq('user_id', userId)
          .order('saved_at', { ascending: false });

        if (error) {
          console.error('❌ 북마크 목록 조회 실패:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch bookmarks'
          });
        }

        return res.status(200).json({
          success: true,
          data: data || []
        });
      }
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ 북마크 API 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};