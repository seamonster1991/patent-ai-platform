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

// ===== 통합된 12개 API 엔드포인트 =====

// 1. 인증 API
app.all('/api/auth', wrapVercelHandler('./api/auth.js'))

// 2. 관리자 API
app.all('/api/admin', wrapVercelHandler('./api/admin.js'))

// 3. 대시보드 API (dashboard-analytics 통합됨)
app.all('/api/dashboard', wrapVercelHandler('./api/dashboard.js'))
app.all('/api/dashboard-analytics', async (req, res) => {
  // dashboard-analytics 요청을 dashboard.js로 리다이렉트하면서 action=analytics 추가
  req.query.action = 'analytics';
  const handler = await import('./api/dashboard.js');
  return handler.default(req, res);
})

// 4. 검색 및 상세 API (detail 통합됨)
app.all('/api/search', wrapVercelHandler('./api/search.js'))
app.all('/api/detail', wrapVercelHandler('./api/search.js')) // detail 요청을 search로 리다이렉트

// 5. 포인트 관리 API
app.all('/api/points', wrapVercelHandler('./api/points.js'))

// 6. 결제 시스템 API
app.all('/api/nicepay', wrapVercelHandler('./api/nicepay.js'))

// 7. 사용자 관리 API
app.all('/api/users', wrapVercelHandler('./api/users.js'))

// 8. 리포트 생성 API
app.all('/api/generate-report', wrapVercelHandler('./api/generate-report.js'))

// 9. 피드백 관리 API
app.all('/api/feedback', wrapVercelHandler('./api/feedback.js'))

// 10. 인기 키워드 API
app.all('/api/popular-keywords', wrapVercelHandler('./api/popular-keywords.js'))

// 11. 헬스체크 API
app.all('/api/health', wrapVercelHandler('./api/health.js'))

// 12. 메인 라우터 API
app.all('/api/index', wrapVercelHandler('./api/index.js'))

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