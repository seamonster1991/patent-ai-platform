const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed',
      message: 'Only POST method is allowed'
    });
  }

  try {
    console.log('=== AI 특허 분석 요청 시작 ===');
    console.log('Request body:', req.body);

    // 환경변수에서 Gemini API 키 가져오기
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    console.log('환경변수 확인:', {
      hasGeminiKey: !!geminiApiKey,
      keyLength: geminiApiKey ? geminiApiKey.length : 0,
      keyPrefix: geminiApiKey ? geminiApiKey.substring(0, 10) + '...' : 'undefined'
    });
    
    if (!geminiApiKey) {
      console.error('❌ Gemini API key not found in environment variables');
      return res.status(500).json({
        success: false,
        error: 'API configuration error',
        message: 'Gemini API key is not configured'
      });
    }
    
    if (geminiApiKey.includes('JKJKJK') || geminiApiKey.length < 30) {
      console.error('❌ Invalid Gemini API key detected');
      return res.status(500).json({
        success: false,
        error: 'API configuration error',
        message: 'Invalid Gemini API key configuration'
      });
    }

    // 요청 데이터 검증
    const { patentData, analysisType = 'comprehensive' } = req.body;
    
    if (!patentData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required data',
        message: 'patentData is required'
      });
    }

    console.log('분석 타입:', analysisType);
    
    // Gemini AI 초기화
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp"
    });

    // 특허 데이터에서 주요 정보 추출
    const patentInfo = extractPatentInfo(patentData);
    
    // 분석 타입에 따른 프롬프트 생성
    const prompt = generateAnalysisPrompt(patentInfo, analysisType);
    
    console.log('🤖 AI 분석 시작...');
    console.log('프롬프트 길이:', prompt.length);
    
    // AI 분석 실행 (타임아웃 설정)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI 분석 요청이 90초를 초과하여 타임아웃되었습니다.')), 90000);
    });
    
    const analysisPromise = (async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();
      return analysisText;
    })();
    
    const analysisText = await Promise.race([analysisPromise, timeoutPromise]);
    
    console.log('✅ AI 분석 완료, 응답 길이:', analysisText.length);
    
    // 분석 결과 파싱 및 구조화
    const structuredAnalysis = parseAnalysisResult(analysisText, analysisType);
    
    // 응답 반환
    const aiResponse = {
      success: true,
      data: {
        analysisType: analysisType,
        patentNumber: patentInfo.applicationNumber,
        patentTitle: patentInfo.inventionTitle,
        analysisDate: new Date().toISOString(),
        analysis: structuredAnalysis,
        rawAnalysis: analysisText
      }
    };
    
    console.log('✅ AI 분석 결과 반환 완료');
    return res.status(200).json(aiResponse);
    
  } catch (error) {
    console.error('❌ AI 분석 오류:', error);
    console.error('오류 스택:', error.stack);
    
    let errorMessage = 'AI 분석 중 오류가 발생했습니다.';
    let statusCode = 500;
    
    // 구체적인 오류 타입별 처리
    if (error.message.includes('타임아웃')) {
      errorMessage = 'AI 분석 요청이 시간 초과되었습니다. 잠시 후 다시 시도해주세요.';
      statusCode = 408;
    } else if (error.message.includes('API_KEY')) {
      errorMessage = 'AI 서비스 인증에 실패했습니다.';
      statusCode = 401;
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      errorMessage = 'AI 서비스 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.';
      statusCode = 429;
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = '네트워크 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
      statusCode = 503;
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    return res.status(statusCode).json({
      success: false,
      error: 'AI analysis error',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// 특허 데이터에서 주요 정보 추출
function extractPatentInfo(patentData) {
  const biblioInfo = patentData.biblioSummaryInfo || {};
  const abstractInfo = patentData.abstractInfo || {};
  const claimInfo = patentData.claimInfo || {};
  const ipcInfo = patentData.ipcInfo || [];
  const applicantInfo = patentData.applicantInfo || [];
  const inventorInfo = patentData.inventorInfo || [];

  // claimInfo 처리 - 배열 또는 객체 모두 지원
  let claims = '';
  if (Array.isArray(claimInfo)) {
    claims = claimInfo.map(claim => claim.claimScope || '').join('\n');
  } else if (claimInfo.claimTextKor) {
    claims = claimInfo.claimTextKor;
  } else if (claimInfo.claimScope) {
    claims = claimInfo.claimScope;
  }

  // abstractInfo 처리 - 다양한 필드명 지원
  let abstract = '';
  if (abstractInfo.astrtCont) {
    abstract = abstractInfo.astrtCont;
  } else if (abstractInfo.abstractTextKor) {
    abstract = abstractInfo.abstractTextKor;
  } else if (abstractInfo.abstractText) {
    abstract = abstractInfo.abstractText;
  }

  return {
    applicationNumber: biblioInfo.applicationNumber || '',
    inventionTitle: biblioInfo.inventionTitle || '',
    inventionTitleEng: biblioInfo.inventionTitleEng || '',
    applicationDate: biblioInfo.applicationDate || '',
    openDate: biblioInfo.openDate || '',
    registerStatus: biblioInfo.registerStatus || '',
    abstract: abstract,
    claims: claims,
    ipcCodes: Array.isArray(ipcInfo) ? ipcInfo.map(ipc => ipc.ipcNumber || '').join(', ') : '',
    applicants: Array.isArray(applicantInfo) ? applicantInfo.map(app => app.name || '').join(', ') : (biblioInfo.applicantName || ''),
    inventors: Array.isArray(inventorInfo) ? inventorInfo.map(inv => inv.name || '').join(', ') : (biblioInfo.inventorName || '')
  };
}

// 분석 타입에 따른 프롬프트 생성
function generateAnalysisPrompt(patentInfo, analysisType) {
  const baseInfo = `
특허 정보:
- 출원번호: ${patentInfo.applicationNumber}
- 발명의 명칭: ${patentInfo.inventionTitle}
- 출원일: ${patentInfo.applicationDate}
- 등록상태: ${patentInfo.registerStatus}
- IPC 분류: ${patentInfo.ipcCodes}
- 출원인: ${patentInfo.applicants}
- 발명자: ${patentInfo.inventors}

초록:
${patentInfo.abstract}

청구항:
${patentInfo.claims}
`;

  const prompts = {
    comprehensive: `
${baseInfo}

위 특허에 대해 다음 항목들을 포함한 종합적인 분석을 수행해주세요:

1. **기술 분야 분석**
   - 주요 기술 분야 및 세부 영역
   - IPC 분류 기반 기술 카테고리
   - 관련 산업 분야

2. **핵심 기술 요약**
   - 발명의 핵심 아이디어
   - 주요 기술적 특징
   - 해결하고자 하는 기술적 과제

3. **특허성 평가**
   - 신규성 관점에서의 평가
   - 진보성 관점에서의 평가
   - 산업상 이용가능성

4. **시장성 분석**
   - 상업적 활용 가능성
   - 시장 규모 및 성장 전망
   - 주요 응용 분야

5. **경쟁 기술 비교**
   - 기존 기술 대비 장점
   - 예상되는 경쟁 기술
   - 기술적 차별화 포인트

각 항목에 대해 구체적이고 전문적인 분석을 제공해주세요.
`,

    technical: `
${baseInfo}

위 특허의 기술적 측면에 대해 상세히 분석해주세요:

1. **기술 구성 요소**
2. **기술적 원리 및 메커니즘**
3. **기술적 효과 및 장점**
4. **기술적 한계 및 개선점**
5. **관련 기술과의 비교**
`,

    market: `
${baseInfo}

위 특허의 시장성 및 사업화 관점에서 분석해주세요:

1. **시장 기회 분석**
2. **상업화 가능성**
3. **수익 모델**
4. **시장 진입 전략**
5. **리스크 요인**
`,

    legal: `
${baseInfo}

위 특허의 법적 측면에서 분석해주세요:

1. **특허 권리 범위**
2. **침해 가능성 분석**
3. **회피 설계 가능성**
4. **라이센싱 전략**
5. **법적 리스크**
`
  };

  return prompts[analysisType] || prompts.comprehensive;
}

// 분석 결과 파싱 및 구조화
function parseAnalysisResult(analysisText, analysisType) {
  // 기본 구조화된 응답
  const structured = {
    summary: '',
    sections: []
  };

  try {
    // 텍스트를 섹션별로 분할
    const sections = analysisText.split(/\d+\.\s*\*\*([^*]+)\*\*/).filter(s => s.trim());
    
    if (sections.length > 1) {
      structured.summary = sections[0].trim();
      
      for (let i = 1; i < sections.length; i += 2) {
        if (i + 1 < sections.length) {
          structured.sections.push({
            title: sections[i].trim(),
            content: sections[i + 1].trim()
          });
        }
      }
    } else {
      // 섹션 분할이 실패한 경우 전체 텍스트를 요약으로 사용
      structured.summary = analysisText;
    }
    
    // 분석 타입별 추가 메타데이터
    structured.analysisType = analysisType;
    structured.confidence = calculateConfidence(analysisText);
    structured.keyInsights = extractKeyInsights(analysisText);
    
  } catch (error) {
    console.error('분석 결과 파싱 오류:', error);
    structured.summary = analysisText;
    structured.error = '결과 파싱 중 오류 발생';
  }

  return structured;
}

// 신뢰도 계산 (간단한 휴리스틱)
function calculateConfidence(text) {
  const length = text.length;
  const hasStructure = text.includes('**') && text.includes('1.') && text.includes('2.');
  const hasDetails = text.split('\n').length > 10;
  
  let confidence = 0.5; // 기본값
  
  if (length > 1000) confidence += 0.2;
  if (hasStructure) confidence += 0.2;
  if (hasDetails) confidence += 0.1;
  
  return Math.min(confidence, 1.0);
}

// 핵심 인사이트 추출
function extractKeyInsights(text) {
  const insights = [];
  
  // 간단한 키워드 기반 인사이트 추출
  const keywordPatterns = [
    /혁신적?인?\s*([^.]+)/g,
    /핵심적?인?\s*([^.]+)/g,
    /주요한?\s*([^.]+)/g,
    /중요한?\s*([^.]+)/g
  ];
  
  keywordPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      insights.push(...matches.slice(0, 3)); // 최대 3개까지
    }
  });
  
  return insights.slice(0, 5); // 최대 5개 인사이트
}