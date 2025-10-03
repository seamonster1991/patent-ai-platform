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

    market_analysis: `
${baseInfo}

역할과 제약 조건(강화):
- 당신은 **맥킨지/BCG급** 최고 수준 경영 전략 컨설팅 펌의 **수석 파트너**입니다. 고객은 **C-level** 경영진입니다.
- **톤 앤 매너:** 권위적·객관적·데이터 기반. 감정적 표현과 추상적 수식어 금지.
- **헤딩 구조 강제:** **###**(3단계) 아래에 **####**(4단계) 최소 3개. 광범위한 구조화 필수.
- **길이 제한:** 각 **####** 바로 아래 설명은 최대 2개의 짧은 문장 또는 최대 3개의 불릿 포인트.
- **디자인:** 모든 핵심 용어·수치·결론은 **굵게** 처리.
- **배경 제거:** 개인적·트레이딩·시스템 배경 언급 금지.

## [Part 1] 기술/시장 심층 구조 분석

### 3.1. 기술 혁신 및 근본적 경쟁 우위

#### 3.1.1. 해결된 핵심 기술 난제
- 발명이 **최초로 제거**한 기존 병목 현상 명시.
- 해결 원리의 **기술적 복잡성**과 **모방 난이도** 평가.

#### 3.1.2. 기존 기술 대비 정량적 성능 지표
- **CoGS 절감률:** 주류 기술 대비 **[구체적인 %]**.
- **효율 향상:** 핵심 지표에서 **[구체적인 %]**.
- **통합 용이성:** 기존 인프라 **호환성**과 통합 비용 영향.

#### 3.1.3. 특허 권리 범위 및 방어력 진단
- **원천성 수준:** **[매우 높음/높음/중간/낮음]**.
- **회피 설계 난이도:** 우회 경로 개수 및 난이도.
- **권리 존속 기간:** 경제적 가치 유지 예상 기간.

### 3.2. 목표 시장 및 기술 확산 전략

#### 3.2.1. 시장 규모 및 성장 잠재력
- **TAM(5년):** 글로벌 **[금액 단위]**.
- **확산 속도:** **[기하급수적/선형적/더딤]**.
- **확산 장애 요인:** 상위 3가지 장벽.

#### 3.2.2. 경쟁 환경 및 대체 기술 분석
- **대체 기술의 한계:** 구조적 결함 명시.
- **우위 지속성:** 격차 유지 예상 기간.
- **후발 주자 진입:** 3년 내 대형 경쟁사 진입 가능성.

## [Part 2] 비즈니스 전략 초점 인사이트

### 4.1. 신사업 기회 및 수익 모델 혁신

#### 4.1.1. 구체적인 신사업 제안
- **제품 포트폴리오(프리미엄):** 초기 고마진 제품 정의.
- **서비스 포트폴리오(안정성):** **구독 기반** 컨설팅/유지보수.

#### 4.1.2. 최적의 수익 창출 경로
- **권고 수익 모델:** **[B2B 라이선싱/B2G 공공 조달/B2C 판매]**.
- **기술 로열티율:** 유사 거래 사례 **[최소 %~최대 %]**.

#### 4.1.3. 전략적 기술 가치 추정
- **잠재적 M&A 프리미엄:** 기술 우위로 인한 추가 가치.
- **NPV 기여(5년):** 기술 도입이 기업 NPV에 미치는 영향.

### 4.2. 리스크 관리 및 IP 전략

#### 4.2.1. 최우선 R&D 후속 투자
- **상용화:** 대량 생산 공정 단순화 R&D.
- **권리 확장:** 응용 분야별 특허 포트폴리오.

#### 4.2.2. 전략적 파트너십/제휴 대상
- **협력 유형:** (기술적 보완/시장 접근성) 중 택1 및 근거.
- **파트너십 형태:** **[전략적 투자(SI)/라이선스 아웃/조인트 벤처]**.

#### 4.2.3. 최악의 시나리오 대비
- **특허 무효화 시 반격:** **차선 특허** 및 방어 전략.
- **경쟁사 반격 시나리오:** 우회·대체 전략 예상.
`,

    business_insights: `
${baseInfo}

역할과 제약 조건(강화):
- 당신은 **맥킨지/BCG급** 최고 수준 경영 전략 컨설팅 펌의 **수석 파트너**입니다. 고객은 **C-level** 경영진입니다.
- **톤 앤 매너:** 권위적·객관적·데이터 기반. 감정적 표현과 추상적 수식어 금지.
- **헤딩 구조 강제:** **###**(3단계) 아래에 **####**(4단계) 최소 3개. 광범위한 구조화 필수.
- **길이 제한:** 각 **####** 바로 아래 설명은 최대 2개의 짧은 문장 또는 최대 3개의 불릿 포인트.
- **디자인:** 모든 핵심 용어·수치·결론은 **굵게** 처리.
- **배경 제거:** 개인적·트레이딩·시스템 배경 언급 금지.

## [Part 2] 비즈니스 전략 초점 인사이트

### 4.1. 신사업 기회 및 수익 모델 혁신

#### 4.1.1. 구체적인 신사업 제안
- **제품 포트폴리오(프리미엄):** 초기 고마진 제품 정의.
- **서비스 포트폴리오(안정성):** **구독 기반** 컨설팅/유지보수.

#### 4.1.2. 최적의 수익 창출 경로
- **권고 수익 모델:** **[B2B 라이선싱/B2G 공공 조달/B2C 판매]**.
- **기술 로열티율:** 유사 거래 사례 **[최소 %~최대 %]**.

#### 4.1.3. 전략적 기술 가치 추정
- **잠재적 M&A 프리미엄:** 기술 우위로 인한 추가 가치.
- **NPV 기여(5년):** 기술 도입이 기업 NPV에 미치는 영향.

### 4.2. 리스크 관리 및 IP 전략

#### 4.2.1. 최우선 R&D 후속 투자
- **상용화:** 대량 생산 공정 단순화 R&D.
- **권리 확장:** 응용 분야별 특허 포트폴리오.

#### 4.2.2. 전략적 파트너십/제휴 대상
- **협력 유형:** (기술적 보완/시장 접근성) 중 택1 및 근거.
- **파트너십 형태:** **[전략적 투자(SI)/라이선스 아웃/조인트 벤처]**.

#### 4.2.3. 최악의 시나리오 대비
- **특허 무효화 시 반격:** **차선 특허** 및 방어 전략.
- **경쟁사 반격 시나리오:** 우회·대체 전략 예상.
`

    technical: `
${baseInfo}

위 특허의 기술적 측면에 대해 상세히 분석해주세요:

1. **기술 구성 요소**
2. **기술적 원리 및 메커니즘**
3. **기술적 효과 및 장점**
4. **기술적 한계 및 개선점**
5. **관련 기술과의 비교**
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
    console.log('=== 파싱 디버그 ===');
    console.log('분석 타입:', analysisType);
    console.log('응답 텍스트 길이:', analysisText.length);
    console.log('응답 텍스트 첫 500자:', analysisText.substring(0, 500));
    
    // 여러 패턴으로 텍스트를 섹션별로 분할 시도
    let sections = [];
    
    // 패턴 1: 1. **제목**
    sections = analysisText.split(/\d+\.\s*\*\*([^*]+)\*\*/).filter(s => s.trim());
    console.log('패턴 1 분할된 섹션 수:', sections.length);
    
    // 패턴 1이 실패하면 패턴 2 시도: **제목**
    if (sections.length <= 1) {
      sections = analysisText.split(/\*\*([^*]+)\*\*/).filter(s => s.trim());
      console.log('패턴 2 분할된 섹션 수:', sections.length);
    }
    
    // 패턴 2도 실패하면 패턴 3 시도: 제목: (콜론 기반)
    if (sections.length <= 1) {
      const lines = analysisText.split('\n');
      let currentSection = null;
      let currentContent = [];
      
      for (const line of lines) {
        if (line.includes(':') && (line.includes('가치') || line.includes('시장') || line.includes('우위') || line.includes('위험') || line.includes('기회') || line.includes('전략') || line.includes('모델'))) {
          if (currentSection) {
            sections.push(currentSection, currentContent.join('\n').trim());
          }
          currentSection = line.split(':')[0].trim();
          currentContent = [line.split(':').slice(1).join(':').trim()];
        } else if (currentSection && line.trim()) {
          currentContent.push(line.trim());
        }
      }
      
      if (currentSection) {
        sections.push(currentSection, currentContent.join('\n').trim());
      }
      
      console.log('패턴 3 분할된 섹션 수:', sections.length);
    }
    
    if (sections.length > 1) {
      structured.summary = sections[0].trim();
      
      for (let i = 1; i < sections.length; i += 2) {
        if (i + 1 < sections.length) {
          const title = sections[i].trim();
          const content = sections[i + 1].trim();
          console.log(`섹션 발견: "${title}"`);
          structured.sections.push({
            title: title,
            content: content
          });
        }
      }
    } else {
      // 모든 패턴이 실패한 경우 전체 텍스트를 요약으로 사용
      console.log('모든 섹션 분할 패턴 실패 - 전체 텍스트를 요약으로 사용');
      structured.summary = analysisText;
    }
    
    // 분석 타입별 특화된 필드 매핑
    if (analysisType === 'market_analysis' || analysisType === 'market') {
      // 시장분석 필드 매핑
      const marketFields = mapSectionsToMarketFields(structured.sections);
      Object.assign(structured, marketFields);
      
      // 섹션 매핑이 실패한 경우 전체 텍스트에서 직접 추출
      if (!marketFields.coreValue && !marketFields.targetMarket) {
        console.log('섹션 매핑 실패 - 전체 텍스트에서 직접 추출');
        const directFields = extractMarketFieldsFromText(analysisText);
        Object.assign(structured, directFields);
      }
    } else if (analysisType === 'business_insights' || analysisType === 'business') {
      // 비즈니스 인사이트 필드 매핑
      const businessFields = mapSectionsToBusinessFields(structured.sections);
      Object.assign(structured, businessFields);
      
      // 섹션 매핑이 실패한 경우 전체 텍스트에서 직접 추출
      if (!businessFields.businessOpportunities && !businessFields.competitorStrategy) {
        console.log('섹션 매핑 실패 - 전체 텍스트에서 직접 추출');
        const directFields = extractBusinessFieldsFromText(analysisText);
        Object.assign(structured, directFields);
      }
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

// 시장분석 섹션을 프론트엔드 필드로 매핑
function mapSectionsToMarketFields(sections) {
  const fields = {
    coreValue: '',
    targetMarket: '',
    competitiveAdvantage: '',
    marketDriversAndRisks: ''
  };

  console.log('=== 시장분석 필드 매핑 디버그 ===');
  sections.forEach(section => {
    const title = section.title.toLowerCase();
    const content = section.content;
    console.log(`매핑 시도: "${title}"`);

    if (title.includes('핵심 가치') || title.includes('기술의 핵심')) {
      console.log('-> coreValue로 매핑');
      fields.coreValue = content;
    } else if (title.includes('목표 시장') || title.includes('타겟') || title.includes('target')) {
      console.log('-> targetMarket로 매핑');
      fields.targetMarket = content;
    } else if (title.includes('경쟁') && title.includes('우위')) {
      console.log('-> competitiveAdvantage로 매핑');
      fields.competitiveAdvantage = content;
    } else if (title.includes('성장') || title.includes('위험') || title.includes('동력')) {
      console.log('-> marketDriversAndRisks로 매핑');
      fields.marketDriversAndRisks = content;
    } else {
      console.log('-> 매핑되지 않음');
    }
  });

  console.log('매핑 결과:', Object.keys(fields).filter(key => fields[key]));
  return fields;
}

// 비즈니스 인사이트 섹션을 프론트엔드 필드로 매핑
function mapSectionsToBusinessFields(sections) {
  const fields = {
    businessOpportunities: '',
    competitorStrategy: '',
    rdStrategy: '',
    revenueModel: ''
  };

  console.log('=== 비즈니스 필드 매핑 디버그 ===');
  sections.forEach(section => {
    const title = section.title.toLowerCase();
    const content = section.content;
    console.log(`매핑 시도: "${title}"`);

    if (title.includes('신사업') || title.includes('신제품') || title.includes('기회')) {
      console.log('-> businessOpportunities로 매핑');
      fields.businessOpportunities = content;
    } else if (title.includes('경쟁사') && title.includes('대응')) {
      console.log('-> competitorStrategy로 매핑');
      fields.competitorStrategy = content;
    } else if (title.includes('r&d') || title.includes('m&a') || title.includes('제휴')) {
      console.log('-> rdStrategy로 매핑');
      fields.rdStrategy = content;
    } else if (title.includes('수익') && title.includes('모델')) {
      console.log('-> revenueModel로 매핑');
      fields.revenueModel = content;
    } else {
      console.log('-> 매핑되지 않음');
    }
  });

  console.log('매핑 결과:', Object.keys(fields).filter(key => fields[key]));
  return fields;
}

// 전체 텍스트에서 시장분석 필드 직접 추출
function extractMarketFieldsFromText(text) {
  const fields = {
    coreValue: '',
    targetMarket: '',
    competitiveAdvantage: '',
    marketDriversAndRisks: ''
  };

  // 텍스트를 문단으로 분할
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  // 각 문단을 분석하여 적절한 필드에 할당
  paragraphs.forEach(paragraph => {
    const lowerPara = paragraph.toLowerCase();
    
    if ((lowerPara.includes('핵심') && lowerPara.includes('가치')) || 
        (lowerPara.includes('기술') && lowerPara.includes('혁신'))) {
      if (!fields.coreValue) fields.coreValue = paragraph.trim();
    } else if ((lowerPara.includes('시장') && lowerPara.includes('목표')) ||
               (lowerPara.includes('타겟') && lowerPara.includes('시장'))) {
      if (!fields.targetMarket) fields.targetMarket = paragraph.trim();
    } else if (lowerPara.includes('경쟁') && lowerPara.includes('우위')) {
      if (!fields.competitiveAdvantage) fields.competitiveAdvantage = paragraph.trim();
    } else if ((lowerPara.includes('성장') && lowerPara.includes('동력')) ||
               (lowerPara.includes('위험') && lowerPara.includes('요소'))) {
      if (!fields.marketDriversAndRisks) fields.marketDriversAndRisks = paragraph.trim();
    }
  });

  // 빈 필드가 있으면 일반적인 내용으로 채움
  if (!fields.coreValue) {
    fields.coreValue = '특허 기술의 핵심 가치에 대한 분석이 진행 중입니다.';
  }
  if (!fields.targetMarket) {
    fields.targetMarket = '핵심 목표 시장에 대한 분석이 진행 중입니다.';
  }
  if (!fields.competitiveAdvantage) {
    fields.competitiveAdvantage = '경쟁 기술 우위에 대한 분석이 진행 중입니다.';
  }
  if (!fields.marketDriversAndRisks) {
    fields.marketDriversAndRisks = '시장 성장 동력 및 위험에 대한 분석이 진행 중입니다.';
  }

  console.log('직접 추출된 시장분석 필드:', Object.keys(fields).filter(key => fields[key] && !fields[key].includes('진행 중')));
  return fields;
}

// 전체 텍스트에서 비즈니스 인사이트 필드 직접 추출
function extractBusinessFieldsFromText(text) {
  const fields = {
    businessOpportunities: '',
    competitorStrategy: '',
    rdStrategy: '',
    revenueModel: ''
  };

  // 텍스트를 문단으로 분할
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  // 각 문단을 분석하여 적절한 필드에 할당
  paragraphs.forEach(paragraph => {
    const lowerPara = paragraph.toLowerCase();
    
    if ((lowerPara.includes('신사업') || lowerPara.includes('신제품')) && lowerPara.includes('기회')) {
      if (!fields.businessOpportunities) fields.businessOpportunities = paragraph.trim();
    } else if (lowerPara.includes('경쟁사') && lowerPara.includes('대응')) {
      if (!fields.competitorStrategy) fields.competitorStrategy = paragraph.trim();
    } else if ((lowerPara.includes('r&d') || lowerPara.includes('연구개발')) && 
               (lowerPara.includes('m&a') || lowerPara.includes('제휴'))) {
      if (!fields.rdStrategy) fields.rdStrategy = paragraph.trim();
    } else if (lowerPara.includes('수익') && lowerPara.includes('모델')) {
      if (!fields.revenueModel) fields.revenueModel = paragraph.trim();
    }
  });

  // 빈 필드가 있으면 일반적인 내용으로 채움
  if (!fields.businessOpportunities) {
    fields.businessOpportunities = '신사업/신제품 발굴 기회에 대한 분석이 진행 중입니다.';
  }
  if (!fields.competitorStrategy) {
    fields.competitorStrategy = '경쟁사 대응 전략에 대한 분석이 진행 중입니다.';
  }
  if (!fields.rdStrategy) {
    fields.rdStrategy = 'R&D 및 M&A/제휴 전략에 대한 분석이 진행 중입니다.';
  }
  if (!fields.revenueModel) {
    fields.revenueModel = '예상 수익 모델에 대한 분석이 진행 중입니다.';
  }

  console.log('직접 추출된 비즈니스 필드:', Object.keys(fields).filter(key => fields[key] && !fields[key].includes('진행 중')));
  return fields;
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