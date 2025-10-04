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
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey || geminiApiKey.includes('JKJKJK') || geminiApiKey.length < 30) {
      return res.status(500).json({
        success: false,
        error: 'API configuration error',
        message: 'Invalid Gemini API key configuration'
      });
    }
    
    const { patentData, analysisType = 'comprehensive' } = req.body;
    
    if (!patentData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required data',
        message: 'patentData is required'
      });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    
    // JSON 출력을 위해 강력한 모델 사용 권장 및 responseSchema 지정
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash"
    });

    const patentInfo = extractPatentInfo(patentData);
    
    const ABSTRACT_MAX_LEN = Number(process.env.ABSTRACT_MAX_LEN) || 1500;
    const CLAIMS_MAX_LEN = Number(process.env.CLAIMS_MAX_LEN) || 2000;
    patentInfo.abstract = truncateText(patentInfo.abstract, ABSTRACT_MAX_LEN);
    patentInfo.claims = truncateText(patentInfo.claims, CLAIMS_MAX_LEN);
    
    // 분석 타입에 따른 프롬프트 생성 (JSON 출력을 유도하는 강화 프롬프트)
    const prompt = generateAnalysisPrompt(patentInfo, analysisType);
    
    let analysisText;
    let lastError;
    const maxRetries = 3;
    const retryDelay = 2000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 AI 분석 시도 ${attempt}/${maxRetries} 시작...`);
        const timeoutMs = getTimeoutMs(attempt);
        console.log(`⏰ 타임아웃 설정: ${timeoutMs/1000}초`);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            const timeoutSec = timeoutMs/1000;
            console.error(`⏰ [시도 ${attempt}/${maxRetries}] AI 분석 요청이 ${timeoutSec}초를 초과하여 타임아웃되었습니다.`);
            console.error(`📊 타임아웃 상세 정보: 현재 시도=${attempt}, 설정 시간=${timeoutSec}초, 다음 시도 시간=${attempt < maxRetries ? getTimeoutMs(attempt + 1)/1000 : 'N/A'}초`);
            reject(new Error(`AI 분석 요청이 ${timeoutSec}초를 초과하여 타임아웃되었습니다. (시도 ${attempt}/${maxRetries})`));
          }, timeoutMs);
        });
        
        const analysisPromise = (async () => {
           console.log(`📡 [시도 ${attempt}/${maxRetries}] Gemini API 호출 시작...`);
           console.log(`📝 프롬프트 길이: ${prompt.length}자`);
           const startTime = Date.now();
           
           // 진행 상황 표시를 위한 중간 로그
           const progressInterval = setInterval(() => {
             const elapsed = (Date.now() - startTime) / 1000;
             console.log(`⏳ AI 분석 진행 중... (경과 시간: ${elapsed.toFixed(1)}초)`);
           }, 10000); // 10초마다 진행 상황 로그
           
           try {
             const result = await model.generateContent({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                  temperature: 0.7,
                  topK: 40,
                  topP: 0.95,
                  maxOutputTokens: 8192,
              },
             });
             
             clearInterval(progressInterval);
             
             const response = await result.response;
             const text = response.text();
             const endTime = Date.now();
             
             console.log(`✅ [시도 ${attempt}/${maxRetries}] Gemini API 응답 완료 (${endTime - startTime}ms)`);
             console.log(`📊 응답 길이: ${text?.length || 0}자`);
             
             if (!text || text.trim().length < 50) {
                console.error('❌ AI 응답이 너무 짧거나 비어있습니다:', text?.substring(0, 100));
                throw new Error('AI 응답이 너무 짧거나 비어있습니다.');
             }
             
             // 전체 AI 응답을 로그로 출력 (디버깅용)
             console.log('🔍 === AI 응답 전체 내용 (디버깅) ===');
             console.log(text);
             console.log('🔍 === AI 응답 끝 ===');
             
             console.log('📄 AI 응답 미리보기:', text.substring(0, 200) + '...');
             return text;
           } catch (error) {
             clearInterval(progressInterval);
             throw error;
           }
        })();
        
        analysisText = await Promise.race([analysisPromise, timeoutPromise]);
        console.log(`✅ AI 분석 시도 ${attempt} 성공!`);
        break;
        
      } catch (error) {
        lastError = error;
        console.error(`❌ AI 분석 시도 ${attempt} 실패:`, {
          message: error.message,
          name: error.name,
          code: error.code,
          status: error.status
        });
        
        if (attempt < maxRetries) {
          // 즉시 실패해야 하는 오류들
          if (error.message.includes('API_KEY') || 
              error.message.includes('authentication') ||
              error.message.includes('unauthorized')) {
            console.error('🚫 인증 오류로 재시도 중단');
            throw error;
          }
          
          // 할당량 오류는 즉시 실패
          if (error.message.includes('quota exceeded') ||
              error.message.includes('rate limit exceeded') ||
              error.message.includes('QUOTA_EXCEEDED') ||
              error.message.includes('RATE_LIMIT_EXCEEDED') ||
              error.status === 429 ||
              error.message.includes('Too Many Requests')) {
            console.error('🚫 할당량 초과로 재시도 중단');
            throw error;
          }
          
          console.log(`⏳ ${retryDelay/1000}초 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          console.error('🚫 모든 재시도 실패');
        }
      }
    }
    
    if (!analysisText) {
      throw lastError || new Error('AI 분석에 실패했습니다.');
    }
    
    // 분석 결과 파싱 및 구조화 (JSON 파싱 및 평탄화)
    console.log('🔄 파싱 시작 - AI 응답 길이:', analysisText?.length || 0);
    console.log('🔄 파싱 시작 - 분석 타입:', analysisType);
    
    const structuredAnalysis = parseAnalysisResult(analysisText, analysisType);
    
    console.log('✅ 파싱 완료 - 생성된 섹션 수:', structuredAnalysis?.sections?.length || 0);
    console.log('📊 파싱 결과 미리보기:', {
      reportName: structuredAnalysis?.reportName,
      sectionsCount: structuredAnalysis?.sections?.length,
      firstSectionTitle: structuredAnalysis?.sections?.[0]?.title,
      firstSectionContentLength: structuredAnalysis?.sections?.[0]?.content?.length || 0
    });
    
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
    
    return res.status(200).json(aiResponse);
    
  } catch (error) {
    // 디버깅을 위한 상세 오류 로깅
    console.error('AI Analysis Error Details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      status: error.status,
      statusText: error.statusText
    });
    
    let errorMessage = error.message || 'AI 분석 중 오류가 발생했습니다.';
    let statusCode = 500;
    let errorCode = 'UNKNOWN_ERROR';
    
    // 더 구체적인 오류 분류
    if (error.message.includes('타임아웃') || error.message.includes('timeout')) {
      errorMessage = 'AI 분석 요청이 시간 초과되었습니다. 특허 데이터가 복잡하거나 서버가 바쁠 수 있습니다. 잠시 후 다시 시도해주세요.';
      statusCode = 408;
      errorCode = 'TIMEOUT_ERROR';
    } else if (error.message.includes('API_KEY') || error.message.includes('authentication') || error.message.includes('unauthorized')) {
      errorMessage = 'AI 서비스 인증에 실패했습니다. API 키 설정을 확인해주세요.';
      statusCode = 401;
      errorCode = 'AUTH_ERROR';
    } else if (
      // Google API 특정 할당량 오류만 감지
      error.message.includes('quota exceeded') || 
      error.message.includes('rate limit exceeded') ||
      error.message.includes('QUOTA_EXCEEDED') ||
      error.message.includes('RATE_LIMIT_EXCEEDED') ||
      (error.status === 429) ||
      error.message.includes('Too Many Requests')
    ) {
      errorMessage = 'AI 서비스 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.';
      statusCode = 429;
      errorCode = 'QUOTA_ERROR';
    } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('ECONNRESET')) {
      errorMessage = '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인하고 잠시 후 다시 시도해주세요.';
      statusCode = 503;
      errorCode = 'NETWORK_ERROR';
    } else if (error.message.includes('JSON') || error.message.includes('parse') || error.message.includes('Unexpected token')) {
      errorMessage = 'AI 응답 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      statusCode = 500;
      errorCode = 'PARSE_ERROR';
    } else if (error.message.includes('model') || error.message.includes('invalid') || error.message.includes('MODEL_NOT_FOUND')) {
      errorMessage = 'AI 모델 설정에 문제가 있습니다. 관리자에게 문의해주세요.';
      statusCode = 500;
      errorCode = 'MODEL_ERROR';
    } else {
      errorMessage = error.message || errorMessage;
      errorCode = 'GENERAL_ERROR';
    }
    
    const errorResponse = {
      success: false,
      error: errorCode,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      statusCode: statusCode
    };
    
    return res.status(statusCode).json(errorResponse);
  }
};

// 환경/플랫폼에 맞춘 타임아웃 계산
function getTimeoutMs(attempt) {
  const isVercel = !!process.env.VERCEL;
  // 타임아웃 값 대폭 증가: 기본 60초, 단계별 30초 증가 (60s, 90s, 120s)
  const base = Number(process.env.ANALYSIS_TIMEOUT_MS) || (isVercel ? 15000 : 60000);
  const step = Number(process.env.ANALYSIS_TIMEOUT_STEP_MS) || (isVercel ? 5000 : 30000);
  return base + (attempt - 1) * step;
}

// 긴 텍스트 안전하게 자르기
function truncateText(text, maxLen) {
  if (!text) return '';
  const s = String(text);
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + '…';
}

// 특허 데이터에서 주요 정보 추출 및 텍스트 길이 최적화
function extractPatentInfo(patentData) {
  const biblioInfo = patentData.biblioSummaryInfo || {};
  const abstractInfo = patentData.abstractInfo || {};
  const claimInfo = patentData.claimInfo || {};
  const ipcInfo = patentData.ipcInfo || [];
  const applicantInfo = patentData.applicantInfo || [];
  const inventorInfo = patentData.inventorInfo || [];

  let claims = '';
  if (Array.isArray(claimInfo)) {
    claims = claimInfo.map(claim => claim.claimScope || '').join('\n');
  } else if (claimInfo.claimTextKor) {
    claims = claimInfo.claimTextKor;
  } else if (claimInfo.claimScope) {
    claims = claimInfo.claimScope;
  }

  let abstract = '';
  if (abstractInfo.astrtCont) {
    abstract = abstractInfo.astrtCont;
  } else if (abstractInfo.abstractTextKor) {
    abstract = abstractInfo.abstractTextKor;
  } else if (abstractInfo.abstractText) {
    abstract = abstractInfo.abstractText;
  }

  // 텍스트 길이 최적화: 너무 긴 텍스트는 잘라서 API 오버로드 방지
  const MAX_ABSTRACT_LENGTH = 2000;
  const MAX_CLAIMS_LENGTH = 5000;
  
  const optimizedAbstract = truncateText(abstract, MAX_ABSTRACT_LENGTH);
  const optimizedClaims = truncateText(claims, MAX_CLAIMS_LENGTH);
  
  console.log(`📊 텍스트 최적화: 초록 ${abstract.length} → ${optimizedAbstract.length}자, 청구항 ${claims.length} → ${optimizedClaims.length}자`);

  return {
    applicationNumber: biblioInfo.applicationNumber || '',
    inventionTitle: biblioInfo.inventionTitle || '',
    inventionTitleEng: biblioInfo.inventionTitleEng || '',
    applicationDate: biblioInfo.applicationDate || '',
    openDate: biblioInfo.openDate || '',
    registerStatus: biblioInfo.registerStatus || '',
    abstract: optimizedAbstract,
    claims: optimizedClaims,
    ipcCodes: Array.isArray(ipcInfo) ? ipcInfo.map(ipc => ipc.ipcNumber || '').join(', ') : '',
    applicants: Array.isArray(applicantInfo) ? applicantInfo.map(app => app.name || '').join(', ') : (biblioInfo.applicantName || ''),
    inventors: Array.isArray(inventorInfo) ? inventorInfo.map(inv => inv.name || '').join(', ') : (biblioInfo.inventorName || '')
  };
}

// 분석 타입에 따른 프롬프트 생성 (JSON 출력을 유도하는 강화 프롬프트)
function generateAnalysisPrompt(patentInfo, analysisType) {
  const baseInfo = `
특허 정보:
- 출원번호: ${patentInfo.applicationNumber}
- 발명의 명칭: ${patentInfo.inventionTitle}
- 출원일: ${patentInfo.applicationDate}
- 등록상태: ${patentInfo.registerStatus}
- IPC 분류: ${patentInfo.ipcCodes}
- 출원인: ${patentInfo.applicants}

초록:
${patentInfo.abstract}

청구항:
${patentInfo.claims}
`;

    // 맥킨지 컨설턴트 수준의 전문적인 분석 구조 정의
    const getAnalysisStructure = (type) => {
        if (type === 'market_analysis') {
            return [
                { title: '기술 혁신 및 근본적 경쟁 우위', sub_items: [
                    { 
                        title: '해결된 핵심 기술 난제', 
                        content: '이 특허가 해결한 기존 기술의 핵심 병목 현상과 기술적 한계를 구체적으로 분석하고, 해결 메커니즘의 독창성과 기술적 복잡도를 평가합니다. 기존 솔루션 대비 근본적 차별화 요소와 모방 난이도를 정량적 지표와 함께 제시하여 기술적 우위의 지속가능성을 논증합니다. 특히 해당 기술 분야에서 오랫동안 해결되지 않았던 문제의 본질과 이를 극복한 혁신적 접근법의 가치를 심층 분석합니다.' 
                    },
                    { 
                        title: '기존 기술 대비 정량적 성능 지표', 
                        content: '기존 주류 기술 대비 성능 개선 효과를 구체적인 수치로 제시하며, 생산성 향상률, 비용 절감 효과, 에너지 효율성 개선 등 핵심 KPI를 정량화합니다. 시장에서 검증된 기존 솔루션들과의 벤치마킹을 통해 경쟁 우위의 크기와 범위를 명확히 정의하고, 성능 개선이 고객 가치 창출에 미치는 직접적 영향을 분석합니다. 또한 기술 성숙도에 따른 성능 개선 잠재력과 확장 가능성을 평가하여 장기적 경쟁력을 전망합니다.' 
                    },
                    { 
                        title: '특허 권리 범위 및 방어력 진단', 
                        content: '특허 청구항의 권리 범위 분석을 통해 핵심 기술 요소의 보호 수준과 회피 설계 가능성을 평가합니다. 선행 기술 대비 진보성의 강도와 특허 무효 리스크를 분석하고, 관련 특허 포트폴리오의 전략적 배치 상황을 검토합니다. 특허권의 실질적 행사 가능성과 침해 입증의 용이성을 고려하여 IP 자산으로서의 가치와 방어력을 종합 평가하며, 글로벌 특허 출원 전략의 적절성도 함께 분석합니다.' 
                    }
                ]},
                { title: '목표 시장 및 기술 확산 전략', sub_items: [
                    { 
                        title: '시장 규모 및 성장 잠재력', 
                        content: '해당 기술이 적용 가능한 총 유효 시장(TAM)과 실질 확보 가능 시장(SAM)을 글로벌 관점에서 정량적으로 추정하고, 주요 지역별 시장 특성과 성장 동력을 분석합니다. 기술 도입 주기와 시장 침투율 예측을 통해 5-10년 시계에서의 시장 확산 시나리오를 제시하며, 시장 성장을 견인하는 핵심 트렌드와 규제 환경 변화를 종합적으로 고려합니다. 특히 기술 혁신이 창출할 수 있는 신규 시장 영역과 기존 시장의 대체 가능성을 심층 분석하여 시장 기회의 크기를 정확히 산정합니다.' 
                    },
                    { 
                        title: '경쟁 환경 및 대체 기술 분석', 
                        content: '현재 시장의 주요 플레이어들과 그들의 기술적 접근법을 분석하고, 기존 대체 기술들의 한계점과 본 특허 기술의 차별화 우위를 명확히 정의합니다. 잠재적 경쟁자들의 기술 개발 동향과 특허 출원 패턴을 모니터링하여 경쟁 위협도를 평가하고, 시장 진입 장벽의 높이와 지속가능성을 분석합니다. 또한 기술 생태계 내에서의 협력과 경쟁 관계를 파악하여 전략적 포지셔닝 방안을 제시하며, 향후 5년간 예상되는 경쟁 구도 변화와 대응 전략을 수립합니다.' 
                    }
                ]}
            ];
        } else if (type === 'business_insights') {
             return [
                { title: '신사업 기회 및 수익 모델 혁신', sub_items: [
                    { 
                        title: '구체적인 신사업 제안', 
                        content: '특허 기술을 활용한 고부가가치 제품 및 서비스 포트폴리오를 설계하고, 각각의 시장 진입 전략과 수익성 분석을 제시합니다. 기술의 핵심 가치를 극대화할 수 있는 프리미엄 제품군과 시장 확산을 위한 대중화 제품군을 구분하여 단계적 시장 접근 방안을 수립합니다. 또한 기술 플랫폼을 기반으로 한 생태계 구축 가능성과 네트워크 효과 창출 방안을 분석하여 지속가능한 경쟁 우위 확보 전략을 제안합니다. 특히 디지털 전환과 연계된 새로운 비즈니스 모델 혁신 기회를 탐색하고 구체적인 실행 로드맵을 제시합니다.' 
                    },
                    { 
                        title: '최적의 수익 창출 경로', 
                        content: '기술 특성과 시장 환경을 종합 고려하여 최적의 수익 모델을 설계하고, 라이선싱, 직접 사업화, 전략적 파트너십 등 다양한 옵션의 장단점을 비교 분석합니다. 각 수익 모델별 예상 수익률과 투자 회수 기간을 정량적으로 산정하고, 시장 진입 속도와 리스크 수준을 고려한 최적 포트폴리오를 제안합니다. 또한 글로벌 시장에서의 기술 라이선싱 벤치마크를 분석하여 적정 로열티율과 계약 조건을 제시하며, 장기적 관점에서 기술 가치 극대화를 위한 단계적 수익화 전략을 수립합니다.' 
                    },
                    { 
                        title: '전략적 기술 가치 추정', 
                        content: '특허 기술의 경제적 가치를 다각도로 평가하여 정확한 기술 가치를 산정하고, M&A 시나리오에서의 프리미엄 가치와 독립 사업화 시의 NPV를 비교 분석합니다. 기술의 생명주기와 시장 성장률을 고려한 현금흐름 예측을 통해 장기적 가치 창출 잠재력을 정량화하고, 다양한 시나리오별 민감도 분석을 실시합니다. 또한 기술 포트폴리오 관점에서 다른 IP 자산과의 시너지 효과를 분석하고, 전략적 투자자들의 관점에서 본 기술의 전략적 가치와 프리미엄을 평가하여 최적의 Exit 전략을 제안합니다.' 
                    }
                ]},
                { title: '리스크 관리 및 IP 전략', sub_items: [
                    { 
                        title: '최우선 R&D 후속 투자 방향', 
                        content: '기술 상용화를 위한 핵심 R&D 과제를 우선순위별로 정의하고, 각 과제별 투자 규모와 예상 성과를 구체적으로 제시합니다. 기술 완성도 향상을 위한 단기 과제와 시장 확장을 위한 중장기 과제를 구분하여 단계적 투자 전략을 수립하고, 각 단계별 성공 지표와 의사결정 기준을 명확히 정의합니다. 또한 경쟁 기술 대응과 특허 포트폴리오 강화를 위한 방어적 R&D 투자 방향을 제시하며, 글로벌 기술 트렌드와 연계한 차세대 기술 개발 로드맵을 수립하여 지속적 기술 리더십 확보 방안을 제안합니다.' 
                    },
                    { 
                        title: '전략적 파트너십/제휴 대상', 
                        content: '기술 상용화와 시장 확산을 가속화할 수 있는 최적의 파트너십 대상을 식별하고, 각 파트너와의 협력 모델과 기대 효과를 구체적으로 분석합니다. 기술적 보완성, 시장 접근성, 자본력 등을 종합 고려하여 전략적 파트너의 우선순위를 설정하고, 파트너십 협상에서의 핵심 이슈와 Win-Win 구조를 설계합니다. 또한 글로벌 시장 진출을 위한 지역별 파트너 전략과 현지화 방안을 제시하며, 장기적 관점에서 생태계 구축을 위한 다자간 협력 모델과 플랫폼 전략을 수립합니다.' 
                    },
                    { 
                        title: '최악의 시나리오 대비 리스크 관리', 
                        content: '특허 무효화, 경쟁 기술 출현, 시장 환경 급변 등 주요 리스크 시나리오를 식별하고 각각에 대한 구체적인 대응 전략과 비상 계획을 수립합니다. 특허권 방어를 위한 법적 대응 체계와 대안 기술 확보 방안을 마련하고, 시장 변화에 대한 민첩한 대응을 위한 조기 경보 시스템을 구축합니다. 또한 기술 사업화 과정에서 발생할 수 있는 재무적, 운영적, 기술적 리스크를 종합적으로 평가하고, 리스크 완화를 위한 보험, 헤징, 분산 투자 등의 방안을 제시하여 안정적인 사업 추진을 위한 리스크 관리 체계를 완성합니다.' 
                    }
                ]}
            ];
        }
        return [];
    };


    const structure = getAnalysisStructure(analysisType);
    const instructionContent = JSON.stringify(structure, null, 2);

    const fullPrompt = `
    당신은 맥킨지 & 컴퍼니의 수석 파트너로서 20년 이상의 전략 컨설팅 경험을 보유하고 있으며, 글로벌 Fortune 500 기업들의 기술 혁신 전략과 IP 포트폴리오 최적화를 담당해왔습니다. 

    다음 특허에 대한 ${analysisType === 'market_analysis' ? '시장 분석 리포트' : '비즈니스 인사이트 리포트'}를 작성해주세요.

    === 분석 대상 특허 정보 ===
    ${baseInfo}

    === 분석 요구사항 ===
    다음 구조에 따라 전문적인 분석을 제공해주세요. 각 섹션은 마크다운 형식으로 작성하고, 구체적인 수치와 데이터를 포함해주세요.

    ${analysisType === 'market_analysis' ? `
    ## 기술 혁신 및 근본적 경쟁 우위

    ### 해결된 핵심 기술 난제
    이 특허가 해결한 기존 기술의 핵심 병목 현상과 기술적 한계를 구체적으로 분석해주세요. 해결 메커니즘의 독창성과 기술적 복잡도를 평가하고, 기존 솔루션 대비 근본적 차별화 요소와 모방 난이도를 설명해주세요.

    ### 기존 기술 대비 정량적 성능 지표
    기존 주류 기술 대비 성능 개선 효과를 구체적인 수치로 제시하고, 생산성 향상률, 비용 절감 효과, 에너지 효율성 개선 등 핵심 KPI를 정량화해주세요.

    ### 특허 권리 범위 및 방어력 진단
    특허 청구항의 권리 범위 분석을 통해 핵심 기술 요소의 보호 수준과 회피 설계 가능성을 평가해주세요.

    ## 목표 시장 및 기술 확산 전략

    ### 시장 규모 및 성장 잠재력
    해당 기술이 적용 가능한 총 유효 시장(TAM)과 실질 확보 가능 시장(SAM)을 글로벌 관점에서 정량적으로 추정해주세요.

    ### 경쟁 환경 및 대체 기술 분석
    현재 시장의 주요 플레이어들과 그들의 기술적 접근법을 분석하고, 기존 대체 기술들의 한계점과 본 특허 기술의 차별화 우위를 명확히 정의해주세요.
    ` : `
    ## 구체적인 신사업 제안

    본 특허 기술을 활용한 **고부가가치 제품 및 서비스 포트폴리오**를 다음과 같이 제안합니다. 각 사업 모델은 시장 메가트렌드와 기술적 차별화 요소를 기반으로 설계되었습니다.

    **프리미엄 제품/서비스 라인 (B2C 모델)**:
    - 구체적인 제품명과 특징을 명시하고, 타겟 고객층과 예상 수익성을 제시해주세요.

    **B2B 솔루션 포트폴리오 (B2B 모델)**:
    - 기업 고객 대상 솔루션의 구체적인 내용과 시장 규모, 경쟁 우위를 분석해주세요.

    **구독/플랫폼 서비스 (구독 모델)**:
    - 서비스 구조와 고객 확보 전략, 수익 구조를 상세히 설명해주세요.

    ## 최적의 수익 창출 경로

    기술 특성과 시장 환경을 종합 고려하여 **단계별 수익 모델 전략**을 제시합니다.

    **1단계: 직접 사업화 (D2C) 전략**
    - 시장 검증 및 브랜드 구축 방안
    - 초기 투자 규모 및 예상 수익성
    - 핵심 성공 요인 및 리스크 분석

    **2단계: 전략적 파트너십 확장**
    - 파트너십 유형별 수익 구조
    - 시장 확장 효과 및 시너지 창출
    - 장기적 성장 전략 및 확장 계획

    ## 전략적 기술 가치 추정

    특허 기술의 **경제적 가치**를 다각도로 평가하여 정확한 기술 가치를 산정합니다.

    **수익 접근법 (할인현금흐름 DCF)**:
    - 예상 현금흐름: 연간 XX억원 (5년간)
    - 할인율: X% (업계 평균 고려)
    - 현재가치: 총 XXX억원

    **시장 접근법 (로열티 비교)**:
    - 유사 기술 로열티율: X-X%
    - 시장 규모 대비 점유율: X%
    - 추정 로열티 수익: 연간 XX억원

    ## 최우선 R&D 후속 투자 방향

    기술 상용화 성공 및 시장 지배력 강화를 위해 다음 **R&D 과제**에 최우선적으로 투자해야 합니다. 각 과제는 시장 요구사항 충족 및 경쟁 우위 확보에 필수적입니다.

    **핵심 기술 고도화 과제**:
    - **과제명**: (투자 규모: X억원, 예상 성과: X년 X개월 내 성능 X% 향상 및 글로벌 경쟁력 확보)
    - **과제명**: (투자 규모: X억원, 예상 성과: X년 내 X종 이상의 혁신적인 제품 라인업 출시)
    - **과제명**: (투자 규모: X억원, 예상 성과: X개월 내 생산성 X% 향상 및 품질 균일성 달성)

    ## 전략적 파트너십/제휴 대상

    기술 상용화와 시장 확산을 가속화하기 위해 다음 유형의 **파트너십 대상**을 식별하고, 구체적인 협력 모델과 기대 효과를 분석합니다.

    **글로벌 대기업 파트너십**:
    - **대상 기업**: (예: 글로벌 제조업체, 기술 기업, 플랫폼 기업 등)
    - **협력 모델**: 기술 라이선싱, 합작 투자, 전략적 제휴
    - **기대 효과**: 시장 접근성 확보, 자본 조달, 기술 시너지

    **전문 기업 제휴**:
    - **대상 기업**: (예: 전문 제조업체, 유통업체, 시스템 통합업체 등)
    - **협력 모델**: OEM/ODM, 독점 공급 계약, 기술 파트너십
    - **기대 효과**: 생산 효율성, 품질 향상, 비용 절감

    **플랫폼 및 구독 서비스 파트너십**:
    - **대상 기업**: (예: 클라우드 서비스 제공업체, 데이터 분석 플랫폼 등)
    - **협력 모델**: API 연동, 플랫폼 통합, 공동 서비스 개발
    - **기대 효과**: 서비스 확장성, 고객 기반 확대, 수익 다각화

    ## 최악의 시나리오 대비 리스크 관리

    본 특허 기술의 사업화 과정에서 발생할 수 있는 **주요 리스크 시나리오**를 식별하고, 각 시나리오에 대한 구체적인 대응 전략과 비상 계획을 수립합니다.

    **특허 무효화 시나리오**:
    - **리스크**: 특허 무효 심판, 경쟁사 특허 침해 소송, 선행 기술 발견
    - **대응 전략**: 추가 특허 출원, 방어 특허 포트폴리오 구축, 특허 분석 강화
    - **비상 계획**: 대안 기술 개발, 라이선싱 협상, 기술 융합 전략

    **경쟁 기술 출현 시나리오**:
    - **리스크**: 우회 기술 개발, 대체 기술 상용화, 기술 표준 변화
    - **대응 전략**: 지속적 기술 혁신, 시장 선점 전략, 표준화 주도
    - **비상 계획**: 기술 융합, 새로운 응용 분야 개척, 차세대 기술 개발
    `}

    === 분석 지침 ===
    - 각 섹션은 최소 300-500자의 상세한 분석을 포함해주세요
    - 구체적인 수치, 시장 데이터, 벤치마크를 포함해주세요
    - 전문 컨설팅 언어를 사용하고 핵심 용어는 **볼드체**로 강조해주세요
    - 해당 기술 분야의 글로벌 트렌드와 연계하여 분석해주세요
    - 실행 가능한 구체적인 권고사항을 제시해주세요
    - 각 하위 항목은 불릿 포인트(-)나 번호 목록을 활용하여 구조화해주세요

    === 중요: 응답 형식 지침 ===
    반드시 다음 마크다운 형식을 정확히 따라주세요:

    ## 구체적인 신사업 제안

    본 특허 기술을 활용한 **고부가가치 제품 및 서비스 포트폴리오**를 다음과 같이 제안합니다.

    **프리미엄 제품/서비스 라인 (B2C 모델)**:
    - **제품명**: 구체적인 제품 설명
    - **타겟 고객**: 명확한 고객층 정의
    - **예상 수익성**: 구체적인 수치 제시

    **B2B 솔루션 포트폴리오 (B2B 모델)**:
    - **솔루션명**: 상세한 솔루션 설명
    - **시장 규모**: 정량적 시장 분석
    - **경쟁 우위**: 차별화 요소

    ## 최적의 수익 창출 경로

    **1단계: 직접 사업화 전략**
    - 시장 검증 방안
    - 투자 규모 및 수익성
    - 핵심 성공 요인

    **2단계: 파트너십 확장**
    - 협력 모델
    - 시장 확장 효과
    - 장기 성장 전략

    === 필수 준수 사항 ===
    - 각 ## 섹션은 반드시 상세한 내용을 포함해야 합니다
    - 하위 항목은 **볼드체**로 강조하고 콜론(:) 다음에 설명을 작성해주세요
    - 불릿 포인트(-)를 활용하여 구조화된 내용을 제시해주세요
    - 빈 섹션이나 제목만 있는 섹션은 절대 생성하지 마세요
    - 최소 6개 이상의 주요 섹션을 포함해주세요
    `;

    return fullPrompt;
}

// 마크다운 텍스트 분석 결과 파싱 및 구조화
function parseAnalysisResult(analysisText, analysisType) {
    console.log('🔄 마크다운 텍스트 파싱 시작:', {
        textLength: analysisText?.length || 0,
        analysisType,
        hasText: !!analysisText
    });

    const structured = {
        reportName: analysisType === 'market_analysis' ? '시장 분석 리포트' : '비즈니스 인사이트 리포트',
        sections: [],
        rawAnalysis: analysisText
    };

    // 입력 검증
    if (!analysisText || typeof analysisText !== 'string') {
        console.error('❌ 유효하지 않은 분석 텍스트');
        return {
            ...structured,
            sections: [
                { 
                    title: '**분석 오류**', 
                    content: 'AI 응답이 유효하지 않습니다. 다시 시도해주세요.' 
                }
            ],
            error: {
                type: 'INVALID_INPUT',
                message: 'Invalid analysis text provided',
                timestamp: new Date().toISOString()
            }
        };
    }

    if (analysisText.trim().length === 0) {
        console.error('❌ 빈 분석 텍스트');
        return {
            ...structured,
            sections: [
                { 
                    title: '**분석 오류**', 
                    content: 'AI가 응답을 생성하지 못했습니다. 다시 시도해주세요.' 
                }
            ],
            error: {
                type: 'EMPTY_RESPONSE',
                message: 'Empty analysis text provided',
                timestamp: new Date().toISOString()
            }
        };
    }

    try {
        const sections = [];
        const lines = analysisText.split('\n');
        
        console.log('📝 텍스트 라인 수:', lines.length);
        console.log('📝 첫 10줄 미리보기:');
        lines.slice(0, 10).forEach((line, index) => {
            console.log(`  ${index + 1}: "${line}"`);
        });

        // 비즈니스 인사이트 리포트를 위한 강화된 헤더 패턴 정의
        const headerPatterns = [
            /^#{1,6}\s+(.+)$/,           // # ~ ###### 헤더
            /^(.+)\n[=\-]{3,}$/,        // 밑줄 스타일 헤더
            /^\*\*(.+)\*\*$/,           // **굵은 글씨** 헤더
            /^__(.+)__$/,               // __굵은 글씨__ 헤더
        ];

        // 비즈니스 인사이트 리포트 전용 패턴 (더 세밀한 구조 인식)
        const businessInsightPatterns = [
            /^(구체적인\s*신사업\s*제안)$/i,                    // "구체적인신사업제안"
            /^(최적의\s*수익\s*창출\s*경로)$/i,                 // "최적의수익창출경로"
            /^(전략적\s*기술\s*가치\s*추정)$/i,                 // "전략적기술가치추정"
            /^(최우선\s*R&D\s*후속\s*투자\s*방향)$/i,           // "최우선R&D후속투자방향"
            /^(전략적\s*파트너십\/제휴\s*대상)$/i,              // "전략적파트너십/제휴대상"
            /^(최악의\s*시나리오\s*대비\s*리스크\s*관리)$/i,     // "최악의시나리오대비리스크관리"
            /^(\d+단계:\s*.+)$/,                               // "1단계: 직접 사업화" 형태
            /^\*\*([^*]+)\*\*:\s*$/,                          // "**수익 접근법**:" 형태
            /^-\s*\*\*([^*]+)\*\*:\s*(.+)$/,                  // "- **과제명**: 설명" 형태
            /^\*\*([^*]+)\*\*:\s*(.+)$/,                      // "**대상 기업**: 설명" 형태
        ];

        let currentSection = null;
        let currentContent = [];
        let foundAnyHeader = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 빈 줄 건너뛰기
            if (line.length === 0) {
                if (currentContent.length > 0) {
                    currentContent.push(''); // 빈 줄 유지 (문단 구분용)
                }
                continue;
            }

            let isHeader = false;
            let headerTitle = null;

            // 다양한 헤더 패턴 확인
            for (const pattern of headerPatterns) {
                const match = line.match(pattern);
                if (match) {
                    headerTitle = match[1].trim();
                    isHeader = true;
                    foundAnyHeader = true;
                    break;
                }
            }

            // 비즈니스 인사이트 리포트 전용 패턴 확인
            if (!isHeader && analysisType === 'business_insight') {
                for (const pattern of businessInsightPatterns) {
                    const match = line.match(pattern);
                    if (match) {
                        if (pattern.source.includes('단계:')) {
                            // "1단계: 직접 사업화" 형태
                            headerTitle = match[1].trim();
                            isHeader = true;
                            foundAnyHeader = true;
                        } else if (pattern.source.includes('\\*\\*.*\\*\\*:\\s*$')) {
                            // "**수익 접근법**:" 형태 (콜론으로 끝남)
                            headerTitle = match[1].trim();
                            isHeader = true;
                            foundAnyHeader = true;
                        }
                        break;
                    }
                }
            }

            // 헤더 발견 시 이전 섹션 저장
            if (isHeader) {
                if (currentSection && currentContent.length > 0) {
                    let content = currentContent.join('\n').trim();
                    
                    // 비즈니스 인사이트 리포트의 경우 추가 포맷팅 적용
                    if (analysisType === 'business_insight' && content.length > 0) {
                        content = formatBusinessInsightContent(content);
                    }
                    
                    if (content.length > 0) {
                        sections.push({
                            title: `**${currentSection}**`,
                            content: content
                        });
                        console.log(`📋 섹션 저장: "${currentSection}" (${content.length}자)`);
                    }
                }
                
                currentSection = headerTitle;
                currentContent = [];
                console.log(`📝 헤더 발견: "${headerTitle}"`);
            }
            // 일반 내용
            else {
                // 비즈니스 인사이트 리포트의 특별한 내용 구조 처리
                if (analysisType === 'business_insight') {
                    // 하위 항목 패턴 확인 및 포맷팅
                    const subItemPatterns = [
                        /^-\s*\*\*([^*]+)\*\*:\s*(.+)$/,     // "- **과제명**: 설명"
                        /^\*\*([^*]+)\*\*:\s*(.+)$/,         // "**대상 기업**: 설명"
                        /^(\d+)\.\s*(.+)$/,                  // "1. 내용"
                        /^[•·▪▫]\s*(.+)$/,                   // "• 내용"
                    ];

                    let formattedLine = line;
                    for (const pattern of subItemPatterns) {
                        const match = line.match(pattern);
                        if (match) {
                            if (pattern.source.includes('-\\s*\\*\\*')) {
                                // "- **과제명**: 설명" 형태
                                formattedLine = `\n**${match[1]}**\n${match[2]}`;
                            } else if (pattern.source.includes('\\*\\*.*\\*\\*:\\s*')) {
                                // "**대상 기업**: 설명" 형태
                                formattedLine = `\n**${match[1]}**\n${match[2]}`;
                            } else if (pattern.source.includes('\\d+\\.')) {
                                // "1. 내용" 형태
                                formattedLine = `\n${match[1]}. ${match[2]}`;
                            } else if (pattern.source.includes('[•·▪▫]')) {
                                // "• 내용" 형태
                                formattedLine = `\n• ${match[1]}`;
                            }
                            break;
                        }
                    }
                    currentContent.push(formattedLine);
                } else {
                    currentContent.push(line);
                }
            }
        }

        // 마지막 섹션 처리
        if (currentSection && currentContent.length > 0) {
            let content = currentContent.join('\n').trim();
            
            // 비즈니스 인사이트 리포트의 경우 추가 포맷팅 적용
            if (analysisType === 'business_insight' && content.length > 0) {
                content = formatBusinessInsightContent(content);
            }
            
            if (content.length > 0) {
                sections.push({
                    title: `**${currentSection}**`,
                    content: content
                });
                console.log(`📋 마지막 섹션 저장: "${currentSection}" (${content.length}자)`);
            }
        }

        // 헤더가 전혀 없는 경우 전체 텍스트를 섹션으로 분할
        if (!foundAnyHeader || sections.length === 0) {
            console.log('📄 헤더가 없어 텍스트를 자동 분할합니다.');
            
            // 문단별로 분할 (빈 줄 기준)
            const paragraphs = analysisText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
            
            if (paragraphs.length > 1) {
                paragraphs.forEach((paragraph, index) => {
                    const trimmed = paragraph.trim();
                    if (trimmed.length > 50) { // 최소 길이 확인
                        // 첫 번째 문장을 제목으로 사용
                        const sentences = trimmed.split(/[.!?]\s+/);
                        const title = sentences[0].substring(0, 50) + (sentences[0].length > 50 ? '...' : '');
                        const content = trimmed;
                        
                        sections.push({
                            title: `**${title}**`,
                            content: content
                        });
                        console.log(`📋 자동 섹션 생성 ${index + 1}: "${title}" (${content.length}자)`);
                    }
                });
            }
        }

        // 빈 섹션 제거 및 품질 검증
        const validSections = sections.filter(section => {
            const hasContent = section.content && section.content.trim().length > 0;
            if (!hasContent) {
                console.warn(`⚠️ 빈 섹션 제거: "${section.title}"`);
            }
            return hasContent;
        });

        // 품질 지표 계산
        const totalContentLength = validSections.reduce((sum, section) => sum + section.content.length, 0);
        console.log(`📊 생성된 리포트 품질 지표: 총 ${validSections.length}개 섹션, 총 ${totalContentLength}자`);
        
        if (totalContentLength < 1000) {
            console.warn('⚠️ 생성된 리포트의 전체 내용이 부족합니다. 더 상세한 분석이 필요합니다.');
        }

        // 강화된 폴백 메커니즘
        if (validSections.length === 0) {
            console.warn('⚠️ 구조화된 섹션을 찾을 수 없어 강화된 폴백 메커니즘을 적용합니다.');
            
            // 1차 폴백: 문장 단위로 분할하여 섹션 생성
            const sentences = analysisText.split(/[.!?]\s+/).filter(s => s.trim().length > 20);
            
            if (sentences.length > 3) {
                console.log('📝 문장 단위로 섹션을 생성합니다.');
                
                // 문장들을 그룹화하여 섹션 생성 (3-5문장씩)
                const sentenceGroups = [];
                for (let i = 0; i < sentences.length; i += 3) {
                    const group = sentences.slice(i, i + 3);
                    if (group.length > 0) {
                        sentenceGroups.push(group.join('. ') + '.');
                    }
                }
                
                sentenceGroups.forEach((group, index) => {
                    if (group.trim().length > 50) {
                        const title = `분석 내용 ${index + 1}`;
                        validSections.push({
                            title: `**${title}**`,
                            content: group.trim()
                        });
                        console.log(`📋 폴백 섹션 생성: "${title}" (${group.length}자)`);
                    }
                });
            }
            
            // 2차 폴백: 전체 텍스트를 단일 섹션으로 처리
            if (validSections.length === 0) {
                console.warn('⚠️ 최종 폴백: 전체 텍스트를 단일 섹션으로 처리합니다.');
                validSections.push({
                    title: `**${structured.reportName}**`,
                    content: analysisText.trim()
                });
            }
        }

        // 최소 품질 보장
        if (validSections.length > 0 && totalContentLength < 100) {
            console.warn('⚠️ 내용이 너무 짧아 추가 정보를 포함합니다.');
            validSections.push({
                title: '**분석 참고사항**',
                content: '이 분석은 제공된 특허 데이터를 바탕으로 AI가 생성한 결과입니다. 더 상세한 분석을 원하시면 다시 시도해주세요.'
            });
        }

        return {
            reportName: structured.reportName,
            sections: validSections,
            rawAnalysis: analysisText,
            qualityMetrics: {
                totalSections: validSections.length,
                totalContentLength: totalContentLength,
                averageContentLength: validSections.length > 0 ? Math.round(totalContentLength / validSections.length) : 0
            }
        };

    } catch (error) {
        console.error('❌ 마크다운 파싱 실패:', error.message);
        console.log('📄 원본 응답 미리보기:', analysisText.substring(0, 500) + '...');
        
        // 파싱 실패 시 전체 텍스트를 단일 섹션으로 반환
        return {
            reportName: structured.reportName,
            sections: [
                { 
                    title: `**${structured.reportName}**`, 
                    content: analysisText.trim()
                }
            ],
            rawAnalysis: analysisText,
            error: {
                type: 'MARKDOWN_PARSE_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };
    }
}

// 비즈니스 인사이트 리포트 콘텐츠 포맷팅 함수 (맥킨지 스타일)
function formatBusinessInsightContent(content) {
    if (!content || typeof content !== 'string') {
        return content;
    }

    let formatted = content;

    // 1. 줄바꿈 정리
    formatted = formatted.replace(/\n{3,}/g, '\n\n'); // 3개 이상의 연속 줄바꿈을 2개로 축소
    formatted = formatted.replace(/\r\n/g, '\n'); // Windows 줄바꿈을 Unix 형식으로 통일

    // 2. 맥킨지 스타일 구조화된 포맷팅
    const lines = formatted.split('\n');
    const improvedLines = [];
    let inListContext = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        if (trimmed.length === 0) {
            improvedLines.push('');
            inListContext = false;
            continue;
        }

        // 3. 주요 카테고리 헤더 강화 (맥킨지 스타일)
        if (trimmed.match(/^\*\*([^*]+)\*\*:\s*$/)) {
            improvedLines.push('');
            improvedLines.push(`### ${trimmed.replace(/\*\*/g, '').replace(':', '')}`);
            improvedLines.push('');
            inListContext = false;
            continue;
        }

        // 4. 하위 카테고리 및 핵심 포인트 포맷팅
        if (trimmed.match(/^\*\*([^*]+)\*\*:\s*(.+)$/)) {
            const match = trimmed.match(/^\*\*([^*]+)\*\*:\s*(.+)$/);
            improvedLines.push(`**${match[1]}**: ${match[2]}`);
            inListContext = true;
            continue;
        }

        // 5. 불릿 포인트 표준화 및 구조화
        if (trimmed.match(/^[-•·▪▫]\s*(.+)$/)) {
            const content = trimmed.replace(/^[-•·▪▫]\s*/, '');
            
            // 하위 불릿 포인트인지 확인
            if (line.startsWith('  ') || line.startsWith('\t')) {
                improvedLines.push(`  - ${content}`);
            } else {
                improvedLines.push(`- ${content}`);
            }
            inListContext = true;
            continue;
        }

        // 6. 번호 목록 정리 (맥킨지 스타일)
        if (trimmed.match(/^\d+\.\s*(.+)$/)) {
            const match = trimmed.match(/^(\d+)\.\s*(.+)$/);
            improvedLines.push(`${match[1]}. **${match[2]}**`);
            inListContext = true;
            continue;
        }

        // 7. 단계별 프로세스 포맷팅
        if (trimmed.match(/^\d+단계:\s*(.+)$/)) {
            const match = trimmed.match(/^(\d+)단계:\s*(.+)$/);
            improvedLines.push('');
            improvedLines.push(`#### ${match[1]}단계: ${match[2]}`);
            improvedLines.push('');
            inListContext = false;
            continue;
        }

        // 8. 일반 텍스트 처리
        if (inListContext && trimmed.length > 0 && !trimmed.startsWith('-') && !trimmed.match(/^\d+\./)) {
            // 리스트 컨텍스트에서 연속된 텍스트는 들여쓰기
            improvedLines.push(`  ${trimmed}`);
        } else {
            // 일반 텍스트
            improvedLines.push(trimmed);
        }
    }

    // 9. 최종 포맷팅 정리
    formatted = improvedLines.join('\n');
    
    // 10. 볼드 텍스트 정리
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, (match, p1) => {
        return `**${p1.trim()}**`;
    });

    // 11. 연속 공백 및 줄바꿈 정리
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    formatted = formatted.replace(/^\s+|\s+$/g, '');

    // 12. 맥킨지 스타일 마무리 포맷팅
    formatted = formatted.replace(/^(.+)$/gm, (line) => {
        const trimmed = line.trim();
        
        // 핵심 수치나 퍼센트가 포함된 라인 강조
        if (trimmed.match(/\d+%|\d+억|\d+조|\d+년|\d+개월/)) {
            return trimmed.replace(/(\d+(?:%|억|조|년|개월))/g, '**$1**');
        }
        
        return line;
    });

    return formatted;
}