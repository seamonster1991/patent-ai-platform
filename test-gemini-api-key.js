const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGeminiAPI() {
  console.log('🧪 Gemini API 키 직접 테스트...');
  
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('API 키 확인:', {
    hasKey: !!apiKey,
    keyLength: apiKey ? apiKey.length : 0,
    keyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'undefined'
  });
  
  if (!apiKey) {
    console.error('❌ API 키가 없습니다.');
    return;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    console.log('🤖 간단한 테스트 요청 시작...');
    
    const prompt = "안녕하세요. 간단한 테스트입니다. '테스트 성공'이라고 답변해주세요.";
    
    // 타임아웃 설정 (30초)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('30초 타임아웃')), 30000);
    });
    
    const apiPromise = (async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    })();
    
    const responseText = await Promise.race([apiPromise, timeoutPromise]);
    
    console.log('✅ API 테스트 성공!');
    console.log('📄 응답:', responseText);
    
  } catch (error) {
    console.error('❌ API 테스트 실패:', error.message);
    console.error('오류 상세:', error);
  }
}

testGeminiAPI()