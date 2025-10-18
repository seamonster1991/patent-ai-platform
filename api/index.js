// API 라우터 엔드포인트 (메인 라우터)
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // API 엔드포인트 목록 반환
    const apiEndpoints = {
      success: true,
      message: 'Patent AI Platform API Router',
      version: '1.0.0',
      endpoints: [
        { path: '/api/auth', description: '인증 관리 (로그인, 회원가입, 토큰 관리)' },
        { path: '/api/admin', description: '관리자 기능' },
        { path: '/api/dashboard', description: '대시보드 및 분석 데이터' },
        { path: '/api/search', description: '특허 검색 및 상세 정보' },
        { path: '/api/points', description: '포인트 관리' },
        { path: '/api/nicepay', description: '결제 시스템' },
        { path: '/api/users', description: '사용자 관리' },
        { path: '/api/generate-report', description: '리포트 생성' },
        { path: '/api/feedback', description: '피드백 관리' },
        { path: '/api/popular-keywords', description: '인기 키워드' },
        { path: '/api/health', description: '시스템 헬스체크' },
        { path: '/api/index', description: 'API 라우터 (현재 엔드포인트)' }
      ],
      total_endpoints: 12,
      timestamp: new Date().toISOString()
    };

    return res.status(200).json(apiEndpoints);

  } catch (error) {
    console.error('❌ API Router error:', error);
    return res.status(500).json({
      success: false,
      error: 'API 라우터 오류가 발생했습니다.',
      message: error.message
    });
  }
}