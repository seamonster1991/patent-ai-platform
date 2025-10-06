// 키워드 기술 분야 분류 API (Gemini AI 활용)
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Gemini API 설정
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// 기술 분야 분류 함수
async function classifyKeywordWithGemini(keyword, context = '') {
  if (!GEMINI_API_KEY) {
    console.error('Gemini API key not found');
    return { field: 'Unknown', confidence: 0 };
  }

  const prompt = `
다음 키워드를 기술 분야별로 분류해주세요. 특허 검색 키워드입니다.

키워드: "${keyword}"
${context ? `컨텍스트: ${context}` : ''}

다음 분야 중 하나로 분류해주세요:
- AI: 인공지능, 머신러닝, 딥러닝, 신경망, 자연어처리, 컴퓨터비전 등
- IoT: 사물인터넷, 센서, 스마트홈, 웨어러블, 무선통신, 임베디드 등
- Bio: 바이오, 생명공학, 의료기기, 제약, 유전자, 바이오센서 등
- Auto: 자동차, 자율주행, 전기차, 배터리, 모빌리티 등
- Semiconductor: 반도체, 칩셋, 프로세서, 메모리, 회로설계 등
- Energy: 에너지, 태양광, 풍력, 배터리, 연료전지 등
- Materials: 소재, 나노기술, 복합재료, 화학 등
- Communication: 통신, 5G, 네트워크, 무선, 광통신 등
- Other: 기타 분야

응답 형식 (JSON):
{
  "field": "분야명",
  "confidence": 0.95,
  "reason": "분류 이유"
}

정확한 JSON 형식으로만 응답해주세요.
`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No response from Gemini API');
    }

    // JSON 응답 파싱
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        field: result.field || 'Other',
        confidence: result.confidence || 0.8,
        reason: result.reason || ''
      };
    }

    // JSON 파싱 실패 시 기본 분류 로직
    return fallbackClassification(keyword);

  } catch (error) {
    console.error('Gemini classification error:', error);
    return fallbackClassification(keyword);
  }
}

// 폴백 분류 로직 (Gemini API 실패 시)
function fallbackClassification(keyword) {
  const lowerKeyword = keyword.toLowerCase();
  
  // AI 관련 키워드
  if (lowerKeyword.includes('ai') || lowerKeyword.includes('인공지능') || 
      lowerKeyword.includes('머신러닝') || lowerKeyword.includes('딥러닝') ||
      lowerKeyword.includes('신경망') || lowerKeyword.includes('machine learning') ||
      lowerKeyword.includes('deep learning') || lowerKeyword.includes('neural')) {
    return { field: 'AI', confidence: 0.7 };
  }
  
  // IoT 관련 키워드
  if (lowerKeyword.includes('iot') || lowerKeyword.includes('센서') ||
      lowerKeyword.includes('스마트') || lowerKeyword.includes('무선') ||
      lowerKeyword.includes('sensor') || lowerKeyword.includes('smart')) {
    return { field: 'IoT', confidence: 0.7 };
  }
  
  // 바이오 관련 키워드
  if (lowerKeyword.includes('바이오') || lowerKeyword.includes('의료') ||
      lowerKeyword.includes('유전자') || lowerKeyword.includes('bio') ||
      lowerKeyword.includes('medical') || lowerKeyword.includes('gene')) {
    return { field: 'Bio', confidence: 0.7 };
  }
  
  // 자동차 관련 키워드
  if (lowerKeyword.includes('자동차') || lowerKeyword.includes('자율주행') ||
      lowerKeyword.includes('전기차') || lowerKeyword.includes('배터리') ||
      lowerKeyword.includes('automotive') || lowerKeyword.includes('vehicle')) {
    return { field: 'Auto', confidence: 0.7 };
  }
  
  // 반도체 관련 키워드
  if (lowerKeyword.includes('반도체') || lowerKeyword.includes('칩') ||
      lowerKeyword.includes('프로세서') || lowerKeyword.includes('메모리') ||
      lowerKeyword.includes('semiconductor') || lowerKeyword.includes('chip')) {
    return { field: 'Semiconductor', confidence: 0.7 };
  }
  
  return { field: 'Other', confidence: 0.5 };
}

// 키워드 분석 데이터 저장
async function saveKeywordAnalytics(userId, keyword, field, confidence) {
  if (!supabase) {
    console.error('Supabase not initialized');
    return false;
  }

  try {
    // search_keyword_analytics 테이블에 데이터 저장/업데이트
    const { data, error } = await supabase
      .from('search_keyword_analytics')
      .upsert({
        user_id: userId,
        technology_field: field,
        keyword: keyword,
        search_count: 1,
        last_searched_at: new Date().toISOString(),
        analytics_date: new Date().toISOString().split('T')[0]
      }, {
        onConflict: 'user_id,technology_field,keyword,analytics_date',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error saving keyword analytics:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveKeywordAnalytics:', error);
    return false;
  }
}

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { keyword, context, userId } = req.body;

    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    // Gemini API로 키워드 분류
    const classification = await classifyKeywordWithGemini(keyword, context);

    // 사용자 ID가 있으면 분석 데이터 저장
    if (userId) {
      await saveKeywordAnalytics(userId, keyword, classification.field, classification.confidence);
    }

    return res.status(200).json({
      keyword,
      field: classification.field,
      confidence: classification.confidence,
      reason: classification.reason || '',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Classification API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}