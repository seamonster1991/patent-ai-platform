require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// API 라우트 설정
app.post('/api/search', async (req, res) => {
  try {
    console.log('🔍 검색 API 호출:', req.body);
    
    // search.js 파일에서 핸들러 가져오기
    const searchHandler = require('./api/search.js');
    
    // 핸들러 실행
    await searchHandler(req, res);
  } catch (error) {
    console.error('❌ 검색 API 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.all('/api/detail', async (req, res) => {
  try {
    console.log('📄 상세 API 호출:', req.method, req.query, req.body);
    
    const detailHandler = require('./api/detail.js');
    await detailHandler(req, res);
  } catch (error) {
    console.error('❌ 상세 API 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.post('/api/ai-analysis', async (req, res) => {
  try {
    console.log('🤖 AI 분석 API 호출:', req.body);
    
    const aiAnalysisHandler = require('./api/ai-analysis.js');
    await aiAnalysisHandler(req, res);
  } catch (error) {
    console.error('❌ AI 분석 API 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 검색 기록 API
app.all('/api/users/search-history/:userId?', async (req, res) => {
  try {
    console.log('📚 검색 기록 API 호출:', req.method, req.params, req.body);
    
    const searchHistoryHandler = require('./api/users/search-history.js');
    await searchHistoryHandler(req, res);
  } catch (error) {
    console.error('❌ 검색 기록 API 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 사용자 통계 API
app.get('/api/users/stats/:userId', async (req, res) => {
  try {
    console.log('📊 사용자 통계 API 호출:', req.params);
    
    const statsHandler = require('./api/users/stats.js');
    await statsHandler(req, res);
  } catch (error) {
    console.error('❌ 사용자 통계 API 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 사용자 리포트 API
app.all('/api/users/stats', async (req, res) => {
  try {
    console.log('📈 사용자 통계 API 호출:', req.method, req.query);
    
    const statsHandler = require('./api/users/stats.js');
    await statsHandler(req, res);
  } catch (error) {
    console.error('❌ 사용자 통계 API 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.all('/api/admin/user-activities', async (req, res) => {
  try {
    console.log('👑 관리자 활동 통계 API 호출:', req.method, req.query);
    
    const adminActivitiesHandler = require('./api/admin/user-activities.js');
    await adminActivitiesHandler(req, res);
  } catch (error) {
    console.error('❌ 관리자 활동 통계 API 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.all('/api/users/reports/:userId', async (req, res) => {
  try {
    console.log('📊 사용자 리포트 API 호출:', req.method, req.params);
    
    const reportsHandler = require('./api/users/reports.js');
    await reportsHandler(req, res);
  } catch (error) {
    console.error('❌ 사용자 리포트 API 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.get('/api/documents', async (req, res) => {
  try {
    console.log('📁 문서 다운로드 API 호출:', req.query);
    
    const documentsHandler = require('./api/documents.js');
    await documentsHandler(req, res);
  } catch (error) {
    console.error('❌ 문서 다운로드 API 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 정적 파일 서빙 (프론트엔드)
app.use(express.static(path.join(__dirname, 'dist')));

// SPA를 위한 fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 테스트 서버가 http://localhost:${PORT}에서 실행 중입니다.`);
  console.log('📡 API 엔드포인트:');
  console.log('  - POST /api/search');
  console.log('  - POST /api/detail');
  console.log('  - POST /api/ai-analysis');
  console.log('  - GET /api/documents');
  console.log('  - POST/GET /api/users/search-history');
});