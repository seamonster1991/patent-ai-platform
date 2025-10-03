require('dotenv').config();
const express = require('express');
const cors = require('cors');
const aiAnalysisHandler = require('./api/ai-analysis');

const app = express();
const PORT = 3001;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// AI 분석 API 엔드포인트
app.post('/api/ai-analysis', aiAnalysisHandler);

// 서버 시작
app.listen(PORT, () => {
  console.log(`Express 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`API 엔드포인트: http://localhost:${PORT}/api/ai-analysis`);
});