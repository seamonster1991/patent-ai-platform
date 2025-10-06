// Express 서버 - API 엔드포인트 제공
const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// 미들웨어 설정
app.use(cors())
app.use(express.json())

// 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`📥 [Server] ${req.method} ${req.url}`)
  next()
})

// API 라우트 등록
app.use('/api/users/stats', require('./api/users/stats.js'))
app.use('/api/users/profile', require('./api/users/profile.js'))
app.use('/api/search', require('./api/search.js'))
app.use('/api/detail', require('./api/detail.js'))
app.use('/api/ai-analysis', require('./api/ai-analysis.js'))

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
  console.error('❌ [Server] 서버 오류:', err)
  res.status(500).json({
    success: false,
    error: '서버 내부 오류가 발생했습니다.',
    message: err.message
  })
})

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 [Server] API 서버가 포트 ${PORT}에서 실행 중입니다.`)
  console.log(`📡 [Server] 헬스 체크: http://localhost:${PORT}/api/health`)
})