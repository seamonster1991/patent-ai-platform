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
      
      // Vercel 함수 형식으로 요청 객체 변환
      const vercelReq = {
        ...req,
        body: req.body,
        query: req.query,
        headers: req.headers,
        method: req.method,
        url: req.url
      };
      
      // 절대 경로로 import
      const absolutePath = path.resolve(process.cwd(), handlerPath);
      const handler = await import(absolutePath);
      return handler.default(vercelReq, res);
    } catch (error) {
      console.error('API handler error:', error);
      // 응답이 이미 전송되었는지 확인
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
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

// 대시보드 API 엔드포인트
app.get('/api/dashboard/metrics', wrapVercelHandler('./api/dashboard/metrics.js'))
app.get('/api/dashboard/comprehensive-stats', wrapVercelHandler('./api/dashboard/comprehensive-stats.js'))
app.get('/api/dashboard/recent-activities', wrapVercelHandler('./api/dashboard/recent-activities.js'))
app.get('/api/dashboard/system-metrics', wrapVercelHandler('./api/dashboard/system-metrics.js'))
app.get('/api/dashboard/extended-stats', wrapVercelHandler('./api/dashboard/extended-stats.js'))
app.get('/api/dashboard/popular-keywords', wrapVercelHandler('./api/dashboard/popular-keywords.js'))
app.get('/api/dashboard/popular-patents', wrapVercelHandler('./api/dashboard/popular-patents.js'))
app.get('/api/dashboard/user-stats', wrapVercelHandler('./api/dashboard/user-stats.js'))
app.get('/api/dashboard/daily-trends', wrapVercelHandler('./api/dashboard/daily-trends.js'))
app.get('/api/dashboard/top-patent-fields', wrapVercelHandler('./api/dashboard/top-patent-fields.js'))
app.get('/api/dashboard/top-keywords', wrapVercelHandler('./api/dashboard/top-keywords.js'))
app.get('/api/dashboard/top-report-categories', wrapVercelHandler('./api/dashboard/top-report-categories.js'))

// 관리자 대시보드 API 엔드포인트
app.get('/api/dashboard/admin-comprehensive-stats', wrapVercelHandler('./api/dashboard/admin-comprehensive-stats.js'))
app.get('/api/dashboard/admin-trends', wrapVercelHandler('./api/dashboard/admin-trends.js'))
app.get('/api/dashboard/admin-top-insights', wrapVercelHandler('./api/dashboard/admin-top-insights.js'))
app.all('/api/dashboard/admin-users', wrapVercelHandler('./api/dashboard/admin-users.js'))
app.all('/api/dashboard/admin-payments', wrapVercelHandler('./api/dashboard/admin-payments.js'))

// 모니터링 API 엔드포인트
app.get('/api/monitoring/logs', wrapVercelHandler('./api/monitoring/logs.js'))

// 포인트 관련 API - 통합 엔드포인트
app.all('/api/points', wrapVercelHandler('./api/points.js'))

// 포인트 관련 API - 개별 엔드포인트 (하위 호환성)
app.get('/api/points/balance', wrapVercelHandler('./api/points-balance.js'))
app.post('/api/points/deduct', wrapVercelHandler('./api/points-deduct.js'))
app.get('/api/points/transactions', wrapVercelHandler('./api/points-transactions.js'))
app.get('/api/points/monthly-free', wrapVercelHandler('./api/points/monthly-free.js'))
app.post('/api/points/monthly-free', wrapVercelHandler('./api/points/monthly-free.js'))

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

// 관리자 API 엔드포인트 (기존)
app.all('/api/admin', wrapVercelHandler('./api/admin.js'))
app.all('/api/admin/auth*', wrapVercelHandler('./api/admin/auth.js'))
app.all('/api/admin/dashboard', wrapVercelHandler('./api/admin/dashboard.js'))
app.all('/api/admin/dashboard/statistics', wrapVercelHandler('./api/admin/dashboard-statistics.js'))
app.all('/api/admin/comprehensive-statistics', wrapVercelHandler('./api/admin/comprehensive-statistics.js'))
app.all('/api/admin/text-statistics', wrapVercelHandler('./api/admin/text-statistics.js'))
app.all('/api/admin/dashboard-charts', wrapVercelHandler('./api/admin/dashboard-charts.js'))
app.all('/api/admin/dashboard/export-text', wrapVercelHandler('./api/admin/dashboard-export.js'))
app.all('/api/admin/users', wrapVercelHandler('./api/admin/users.js'))
app.all('/api/admin/system', wrapVercelHandler('./api/admin/system.js'))
app.all('/api/admin/analytics', wrapVercelHandler('./api/admin/analytics.js'))
app.all('/api/admin/pg-integration', wrapVercelHandler('./api/admin/pg-integration.js'))
app.all('/api/admin/payment-processor', wrapVercelHandler('./api/admin/payment-processor.js'))
app.all('/api/admin/billing-management', wrapVercelHandler('./api/admin/billing-management.js'))

// 새로운 관리자 API v2 엔드포인트
app.all('/api/admin/v2/dashboard', wrapVercelHandler('./api/admin/dashboard-v2.js'))
app.all('/api/admin/v2/users', wrapVercelHandler('./api/admin/users-v2.js'))
app.all('/api/admin/v2/payments', wrapVercelHandler('./api/admin/payments-v2.js'))
app.all('/api/admin/v2/messages', wrapVercelHandler('./api/admin/messages-v2.js'))
app.all('/api/admin/v2/settings', wrapVercelHandler('./api/admin/settings-v2.js'))

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