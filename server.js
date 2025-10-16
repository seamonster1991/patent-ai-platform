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

// Add better JSON parsing with error handling
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      console.error('JSON parsing error:', e.message, 'Body:', buf.toString());
      res.status(400).json({ error: 'Invalid JSON format' });
      return;
    }
  }
}))

// Add error handler for JSON parsing
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('JSON parsing middleware error:', error.message);
    return res.status(400).json({ error: 'Invalid JSON format' });
  }
  next();
})

// 미들웨어 설정 (로깅 제거됨)

// API 라우트 등록 - Vercel 함수를 Express 라우터로 래핑
const wrapVercelHandler = (handlerPath) => {
  return async (req, res) => {
    try {
      // Vercel 함수 형식으로 요청 객체 변환
      const vercelReq = {
        ...req,
        body: req.body,
        query: req.query,
        headers: req.headers,
        method: req.method,
        url: req.url
      };
      
      const handler = await import(handlerPath);
      return handler.default(vercelReq, res);
    } catch (error) {
      console.error('API handler error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// 주요 API 엔드포인트만 등록
app.get('/api/dashboard-analytics', wrapVercelHandler('./api/dashboard-analytics.js'))
app.get('/api/popular-keywords', wrapVercelHandler('./api/popular-keywords.js'))
app.post('/api/search', wrapVercelHandler('./api/search.js'))
app.get('/api/detail', wrapVercelHandler('./api/detail.js'))
app.post('/api/generate-report', wrapVercelHandler('./api/generate-report.js'))

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

// 나이스페이 결제 관련 API 엔드포인트
app.post('/api/nicepay', wrapVercelHandler('./api/nicepay.js'))

// 사용자 프로필 관련 API 엔드포인트
app.get('/api/users/profile', wrapVercelHandler('./api/users/profile.js'))
app.put('/api/users/profile', wrapVercelHandler('./api/users/profile.js'))

// 사용자 활동 추적 API 엔드포인트
app.all('/api/user_activities', wrapVercelHandler('./api/user-activities.js'))

// 관리자 API 엔드포인트 (기존)
app.all('/api/admin', wrapVercelHandler('./api/admin.js'))
app.all('/api/admin/auth', wrapVercelHandler('./api/admin/auth.js'))
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
  res.status(500).json({
    success: false,
    error: '서버 내부 오류가 발생했습니다.',
    message: err.message
  })
})

// 서버 시작
server.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
  console.log(`WebSocket server running on ws://localhost:${PORT}/admin/socket.io`)
})