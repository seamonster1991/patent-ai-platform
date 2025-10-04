const https = require('https');

console.log('🧪 간단한 API 테스트 시작...');

const data = JSON.stringify({
  patentData: {
    biblioSummaryInfo: {
      inventionTitle: "간단한 테스트",
      applicationNumber: "1020250130795",
      applicantName: "테스트"
    },
    abstractInfo: {
      abstractTextKor: "간단한 테스트입니다."
    }
  },
  analysisType: "market"
});

const options = {
  hostname: 'p-ai-seongwankim-1691-re-chip.vercel.app',
  port: 443,
  path: '/api/ai-analysis',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  },
  timeout: 10000 // 10초 타임아웃
};

const req = https.request(options, (res) => {
  console.log('📡 응답 상태:', res.statusCode);
  console.log('📋 응답 헤더:', res.headers);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 응답 데이터:', responseData);
    if (responseData) {
      try {
        const parsed = JSON.parse(responseData);
        console.log('✅ 파싱된 응답:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('❌ JSON 파싱 실패:', e.message);
      }
    }
  });
});

req.on('error', (e) => {
  console.error('❌ 요청 오류:', e.message);
});

req.on('timeout', () => {
  console.error('⏰ 요청 타임아웃 (10초)');
  req.destroy();
});

req.write(data);
req.end();