// Express 서버 - API 엔드포인트 제공
import express from 'express'
import cors from 'cors'
import path from 'path'
import { createServer } from 'http'
import { config } from 'dotenv'
config()

const app = express()
const server = createServer(app)
const PORT = process.env.PORT || 3001

// 미들웨어 설정
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}))

// JSON 파싱 미들웨어 - 단순화
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 미들웨어 설정 (로깅 제거됨)

// API 라우트 등록 - Vercel 함수를 Express 라우터로 래핑
const wrapVercelHandler = (handlerPath) => {
  return async (req, res) => {
    try {
      console.log(`[wrapVercelHandler] ${req.method} ${req.url} -> ${handlerPath}`);
      console.log(`[wrapVercelHandler] Request body:`, req.body);
      console.log(`[wrapVercelHandler] Request body type:`, typeof req.body);
      
      // 요청 본문 처리 (Express에서 이미 파싱됨)
      let processedBody = req.body;
      
      // Vercel 함수 형식으로 요청 객체 변환
      const vercelReq = {
        ...req,
        body: processedBody || {},
        query: req.query || {},
        headers: req.headers || {},
        method: req.method,
        url: req.url
      };
      
      // Windows에서 ESM 모듈 로딩을 위한 file:// URL 스키마 사용
      const absolutePath = path.resolve(process.cwd(), handlerPath);
      const fileUrl = `file://${absolutePath.replace(/\\/g, '/')}`;
      const handler = await import(fileUrl);
      return handler.default(vercelReq, res);
    } catch (error) {
      console.error('API handler error:', error);
      console.error('Error stack:', error.stack);
      // 응답이 이미 전송되었는지 확인
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false,
          error: '서버 내부 오류가 발생했습니다.',
          message: error.message,
          details: error.stack
        });
      }
    }
  };
};

// 주요 API 엔드포인트만 등록
app.get('/api/dashboard-analytics', wrapVercelHandler('./api/dashboard-analytics.js'))
app.get('/api/popular-keywords', wrapVercelHandler('./api/popular-keywords.js'))
app.post('/api/search', wrapVercelHandler('./api/search.js'))
app.get('/api/detail', wrapVercelHandler('./api/detail.js'))
app.post('/api/generate-report', wrapVercelHandler('./api/generate-report.js'))

// 대시보드 API 엔드포인트 (기본 대시보드 분석만 사용)
app.get('/api/dashboard', wrapVercelHandler('./api/dashboard.js'))

// 대시보드 하위 엔드포인트 추가
app.get('/api/dashboard/metrics', wrapVercelHandler('./api/dashboard.js'))
app.get('/api/dashboard/extended-stats', wrapVercelHandler('./api/dashboard.js'))
app.get('/api/dashboard/popular-keywords', wrapVercelHandler('./api/dashboard.js'))
app.get('/api/dashboard/popular-patents', wrapVercelHandler('./api/dashboard.js'))
app.get('/api/dashboard/daily-trends', wrapVercelHandler('./api/dashboard.js'))
app.get('/api/dashboard/top-patent-fields', wrapVercelHandler('./api/dashboard.js'))

// 관리자 대시보드 사용자 및 결제 관리 엔드포인트
app.get('/api/dashboard/admin-users', wrapVercelHandler('./api/dashboard.js'))
app.get('/api/dashboard/admin-payments', wrapVercelHandler('./api/dashboard.js'))
app.get('/api/dashboard/admin-stats', wrapVercelHandler('./api/dashboard.js'))

// 모니터링 API 엔드포인트
app.get('/api/monitoring/logs', wrapVercelHandler('./api/monitoring/logs.js'))

// 포인트 관리 API
app.all('/api/points', wrapVercelHandler('./api/points.js'))
app.all('/api/points/monthly-free', wrapVercelHandler('./api/points.js'))
app.get('/api/points/expiring-points', wrapVercelHandler('./api/points.js'))

// 포인트 세부 API
app.get('/api/points/balance', wrapVercelHandler('./api/points-balance.js'))
app.post('/api/points/deduct', wrapVercelHandler('./api/points-deduct.js'))
app.get('/api/points/transactions', wrapVercelHandler('./api/points-transactions.js'))

// 결제 관련 API 엔드포인트
app.post('/api/billing', wrapVercelHandler('./api/billing.js'))
app.post('/api/webhook/payment-completed', wrapVercelHandler('./api/webhook-payment-completed.js'))

// 결제 관리 API 엔드포인트
app.get('/api/payments', wrapVercelHandler('./api/v1/payments/index.js'))
app.get('/api/payments/stats', wrapVercelHandler('./api/v1/payments/index.js'))

// 나이스페이 결제 관련 API 엔드포인트
app.all('/api/nicepay', wrapVercelHandler('./api/nicepay.js'))

// 사용자 프로필 API 엔드포인트
app.get('/api/users/profile', wrapVercelHandler('./api/users/profile.js'))
app.put('/api/users/profile', wrapVercelHandler('./api/users/profile.js'))

// 사용자 관리 API 엔드포인트 - 테스트
app.get('/api/users-test', (req, res) => {
  console.log('Test route called');
  res.json({ message: 'Test route working' });
});
app.get('/api/users', wrapVercelHandler('./api/v1/users/index.js'))
app.all('/api/v1/users*', wrapVercelHandler('./api/v1/users/index.js'))

// V1 대시보드 API 엔드포인트
app.all('/api/v1/dashboard/metrics*', wrapVercelHandler('./api/v1/dashboard/metrics.js'))
app.all('/api/v1/dashboard/activities*', wrapVercelHandler('./api/v1/dashboard/activities.js'))

// 사용자 활동 API 엔드포인트
app.all('/api/user_activities', wrapVercelHandler('./api/user-activities.js'))

// 피드백 API 엔드포인트
app.all('/api/feedback', wrapVercelHandler('./api/feedback.js'))

// 인증 API 엔드포인트 (일반 사용자 로그인/회원가입)
app.all('/api/auth', wrapVercelHandler('./api/auth.js'))

// 관리자 API 엔드포인트 (기본 관리자 API만 사용)
app.all('/api/admin', wrapVercelHandler('./api/admin.js'))
app.all('/api/admin/*', wrapVercelHandler('./api/admin.js'))

// 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API 서버가 정상적으로 작동 중입니다.',
    timestamp: new Date().toISOString()
  })
})

// 404 핸들러
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API 엔드포인트를 찾을 수 없습니다.',
    path: req.path
  })
})

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  // 응답이 이미 전송되었는지 확인
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
      message: err.message
    })
  }
})

// 서버 시작
server.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
  console.log(`WebSocket server running on ws://localhost:${PORT}/admin/socket.io`)
})