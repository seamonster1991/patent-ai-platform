const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화 (안전한 초기화)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

try {
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase 클라이언트 초기화 성공');
  } else {
    console.warn('⚠️ Supabase 환경변수 누락:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });
  }
} catch (error) {
  console.error('❌ Supabase 클라이언트 초기화 실패:', error.message);
  supabase = null;
}

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 현재는 POST만 지원. (필요 시 GET 다운로드 지원 추가 가능)
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed',
      message: 'Only POST method is allowed'
    });
  }

  const startTime = Date.now();
  console.log('🚀 리포트 생성 API 호출됨 - 시작 시간:', new Date().toISOString());

  try {
    // Gemini API 키 확인 - 더 엄격한 검증
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('🔑 API 키 확인 중...');
    
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY 환경 변수가 설정되지 않음');
      return res.status(500).json({
        success: false,
        error: 'API configuration error',
        message: 'Gemini API key is not configured'
      });
    }
    
    if (apiKey === 'your-gemini-api-key-here' || apiKey.length < 20) {
      console.error('❌ 유효하지 않은 Gemini API 키:', apiKey.substring(0, 10) + '...');
      return res.status(500).json({
        success: false,
        error: 'API configuration error',
        message: 'Invalid Gemini API key format'
      });
    }

    console.log('✅ API 키 검증 완료');

    // 요청 데이터 검증 - 더 상세한 검증
    const { patentData, reportType, userId } = req.body;
    console.log('📋 요청 데이터 검증 중...', {
      hasPatentData: !!patentData,
      reportType,
      userId,
      patentDataKeys: patentData ? Object.keys(patentData) : []
    });
    
    if (!patentData || typeof patentData !== 'object') {
      console.error('❌ 특허 데이터가 없거나 유효하지 않음');
      return res.status(400).json({
        success: false,
        error: 'Missing required data',
        message: 'Valid patentData object is required'
      });
    }

    if (!reportType || !['market', 'business'].includes(reportType)) {
      console.error('❌ 유효하지 않은 리포트 타입:', reportType);
      return res.status(400).json({
        success: false,
        error: 'Invalid report type',
        message: 'reportType must be either "market" or "business"'
      });
    }

    console.log('✅ 요청 데이터 검증 완료 - 리포트 타입:', reportType);
    
    // Gemini AI 초기화
    console.log('🤖 Gemini AI 초기화 중...');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });

    // 특허 정보 추출 - 강화된 에러 처리
    console.log('📊 특허 정보 추출 중...');
    const patentInfo = extractPatentInfo(patentData);
    
    // 추출된 정보 검증
    if (!patentInfo.inventionTitle && !patentInfo.abstract) {
      console.error('❌ 필수 특허 정보가 부족함:', patentInfo);
      return res.status(400).json({
        success: false,
        error: 'Insufficient patent data',
        message: '특허 제목 또는 초록 정보가 필요합니다.'
      });
    }

    console.log('✅ 특허 정보 추출 완료:', {
      title: patentInfo.inventionTitle?.substring(0, 50) + '...',
      applicationNumber: patentInfo.applicationNumber,
      hasAbstract: !!patentInfo.abstract,
      hasClaims: !!patentInfo.claims
    });

    // 리포트 타입별 프롬프트 생성
    console.log('📝 프롬프트 생성 중...');
    const prompt = generateReportPrompt(patentInfo, reportType);
    console.log('✅ 프롬프트 생성 완료 - 길이:', prompt.length);

    // AI 분석 실행 (재시도 로직 포함)
    console.log('🧠 AI 분석 시작...');
    const maxRetries = 3;
    const baseTimeoutMs = 120000; // 기본 120초로 증가
    
    let analysisText;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const currentTimeoutMs = baseTimeoutMs + (attempt - 1) * 30000; // 시도마다 30초씩 증가
      console.log(`⏰ [시도 ${attempt}/${maxRetries}] 타임아웃 설정: ${currentTimeoutMs/1000}초`);
      
      try {
        const analysisPromise = model.generateContent(prompt);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.error(`⏰ [시도 ${attempt}/${maxRetries}] AI 분석 타임아웃 발생`);
            reject(new Error(`AI 분석 시간 초과 (${currentTimeoutMs/1000}초)`));
          }, currentTimeoutMs);
        });

        console.log(`📡 [시도 ${attempt}/${maxRetries}] Gemini API 호출 중...`);
        const result = await Promise.race([analysisPromise, timeoutPromise]);
        console.log(`📡 [시도 ${attempt}/${maxRetries}] Gemini API 응답 받음`);
        
        const response = await result.response;
        console.log(`📄 [시도 ${attempt}/${maxRetries}] 응답 텍스트 추출 중...`);
        analysisText = response.text();
        
        // 응답 검증
        if (!analysisText || analysisText.trim().length < 100) {
          throw new Error('응답이 너무 짧거나 비어있음');
        }
        
        console.log(`✅ [시도 ${attempt}/${maxRetries}] 응답 텍스트 추출 완료 (${analysisText.length}자)`);
        break; // 성공 시 루프 종료
        
      } catch (apiError) {
        lastError = apiError;
        console.error(`❌ [시도 ${attempt}/${maxRetries}] Gemini API 호출 오류:`, {
          message: apiError.message,
          status: apiError.status,
          statusText: apiError.statusText,
          code: apiError.code,
          details: apiError.details
        });
        
        if (attempt === maxRetries) {
          console.error('❌ 모든 재시도 실패, 최종 오류 발생');
          throw lastError;
        }
        
        // 재시도 전 대기 (지수 백오프)
        const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
        console.log(`⏳ [시도 ${attempt}/${maxRetries}] ${waitTime/1000}초 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    const processingTime = Date.now() - startTime;
    console.log('✅ AI 분석 완료:', {
      responseLength: analysisText.length,
      processingTime: `${processingTime}ms`
    });

    // 결과 구조화 - 강화된 파싱
    console.log('🔄 결과 구조화 중...');
    const structuredResult = parseReportResult(analysisText, reportType);
    
    if (!structuredResult || !structuredResult.sections || structuredResult.sections.length === 0) {
      console.error('❌ 구조화된 결과가 비어있음');
      return res.status(500).json({
        success: false,
        error: 'Report parsing error',
        message: '리포트 결과를 구조화하는데 실패했습니다.'
      });
    }

    console.log('✅ 결과 구조화 완료 - 섹션 수:', structuredResult.sections.length);

    // 활동 추적 - 보고서 생성 기록
    if (userId && supabase) {
      try {
        console.log('📊 보고서 생성 활동 추적 중...');
        
        // AI 분석 활동 추적
        const { error: activityError } = await supabase
          .from('user_activities')
          .insert({
            user_id: userId,
            activity_type: 'ai_analysis',
            activity_data: {
              application_number: patentInfo.applicationNumber,
              analysis_type: reportType,
              patent_title: patentInfo.inventionTitle,
              timestamp: new Date().toISOString()
            }
          });

        if (activityError) {
          console.error('❌ AI 분석 활동 추적 오류:', activityError);
        } else {
          console.log('✅ AI 분석 활동 추적 완료');
        }

        // 보고서 데이터베이스에 저장
        const { data: reportRecord, error: reportError } = await supabase
          .from('ai_analysis_reports')
          .insert({
            user_id: userId,
            patent_id: patentInfo.applicationNumber,
            invention_title: patentInfo.inventionTitle,
            application_number: patentInfo.applicationNumber,
            analysis_type: reportType,
            analysis_data: structuredResult,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (reportError) {
          console.error('❌ 보고서 저장 오류:', reportError);
        } else {
          console.log('✅ 보고서 저장 완료:', reportRecord.id);
          // 보고서 생성 활동 로깅
          try {
            const { error: genLogErr } = await supabase
              .from('user_activities')
              .insert({
                user_id: userId,
                activity_type: 'report_generate',
                activity_data: {
                  report_id: reportRecord.id,
                  report_type: reportType,
                  application_number: patentInfo.applicationNumber,
                  title: patentInfo.inventionTitle,
                  timestamp: new Date().toISOString()
                }
              });
            if (genLogErr) {
              console.error('❌ 보고서 생성 활동 로깅 실패:', genLogErr);
            } else {
              console.log('✅ 보고서 생성 활동 로깅 완료');
            }
          } catch (genActErr) {
            console.error('❌ 보고서 생성 활동 로깅 중 예외:', genActErr);
          }
        }

      } catch (trackingError) {
        console.error('❌ 활동 추적 오류:', trackingError);
        // 활동 추적 실패는 리포트 생성에 영향을 주지 않음
      }
    } else if (userId && !supabase) {
      console.warn('⚠️ Supabase 연결이 없어 활동 추적을 건너뜁니다.');
    }

    // 성공 응답
    const totalTime = Date.now() - startTime;
    console.log('🎉 리포트 생성 성공 - 총 처리 시간:', `${totalTime}ms`);
    
    res.status(200).json({
      success: true,
      data: {
        reportType,
        content: structuredResult,
        generatedAt: new Date().toISOString(),
        processingTime: totalTime,
        patentInfo: {
          applicationNumber: patentInfo.applicationNumber,
          title: patentInfo.inventionTitle
        }
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ 리포트 생성 오류:', {
      error: error.message,
      stack: error.stack,
      processingTime: `${totalTime}ms`
    });
    
    // 에러 타입별 상세 처리
    let statusCode = 500;
    let errorMessage = '리포트 생성 중 오류가 발생했습니다.';
    let errorType = 'general';
    
    if (error.message.includes('시간 초과') || error.message.includes('timeout')) {
      statusCode = 408;
      errorMessage = 'AI 분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
      errorType = 'timeout';
    } else if (error.message.includes('API key') || error.message.includes('authentication')) {
      statusCode = 401;
      errorMessage = 'AI 서비스 인증 오류입니다.';
      errorType = 'api';
    } else if (error.message.includes('quota') || error.message.includes('limit') || error.message.includes('rate')) {
      statusCode = 429;
      errorMessage = 'AI 서비스 사용량 한도에 도달했습니다.';
      errorType = 'quota';
    } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
      statusCode = 503;
      errorMessage = '네트워크 연결 오류입니다. 인터넷 연결을 확인해주세요.';
      errorType = 'network';
    } else if (error.message.includes('Invalid') || error.message.includes('parsing')) {
      statusCode = 400;
      errorMessage = '요청 데이터가 유효하지 않습니다.';
      errorType = 'validation';
    }

    res.status(statusCode).json({
      success: false,
      error: error.name || 'ReportGenerationError',
      errorType,
      message: errorMessage,
      processingTime: totalTime,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

// 특허 데이터에서 주요 정보 추출 - 강화된 null/undefined 처리
function extractPatentInfo(patentData) {
  // 안전한 문자열 추출 함수
  const safeExtract = (value, defaultValue = '정보 없음') => {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'string') return value.trim() || defaultValue;
    if (typeof value === 'object' && value.toString) return value.toString().trim() || defaultValue;
    return String(value).trim() || defaultValue;
  };

  // 배열 데이터 안전 처리
  const safeArrayExtract = (value, defaultValue = '정보 없음') => {
    if (Array.isArray(value) && value.length > 0) {
      return value.filter(item => item && String(item).trim()).join(', ') || defaultValue;
    }
    return safeExtract(value, defaultValue);
  };

  // 날짜 형식 정규화
  const normalizeDateString = (dateValue) => {
    if (!dateValue) return '정보 없음';
    const dateStr = safeExtract(dateValue, '');
    if (dateStr === '정보 없음') return dateStr;
    
    // 날짜 형식 검증 및 정규화
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr; // 유효하지 않은 날짜면 원본 반환
      return date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
    } catch (e) {
      return dateStr; // 파싱 실패시 원본 반환
    }
  };

  const biblioInfo = patentData.biblioSummaryInfo || {};
  const abstractInfo = patentData.abstractInfo || {};
  const claimInfo = patentData.claimInfo || {};
  const ipcInfo = patentData.ipcInfo || [];
  const applicantInfo = patentData.applicantInfo || [];
  const inventorInfo = patentData.inventorInfo || [];

  console.log('📊 특허 데이터 원본 구조:', {
    keys: Object.keys(patentData || {}),
    hasTitle: !!(biblioInfo?.inventionTitle),
    hasAbstract: !!(abstractInfo?.abstractTextKor || abstractInfo?.abstractText),
    hasClaims: !!claimInfo
  });

  // claimInfo 처리 - 배열 또는 객체 모두 지원
  let claims = '';
  if (Array.isArray(claimInfo)) {
    claims = claimInfo.map(claim => claim.claimScope || '').join('\n');
  } else if (claimInfo.claimTextKor) {
    claims = claimInfo.claimTextKor;
  } else if (claimInfo.claimScope) {
    claims = claimInfo.claimScope;
  }

  const extractedInfo = {
    applicationNumber: safeExtract(biblioInfo.applicationNumber),
    inventionTitle: safeExtract(biblioInfo.inventionTitle, '제목 정보 없음'),
    inventionTitleEng: safeExtract(biblioInfo.inventionTitleEng),
    applicationDate: normalizeDateString(biblioInfo.applicationDate),
    registerStatus: safeExtract(biblioInfo.registerStatus),
    abstract: safeExtract(abstractInfo.abstractTextKor || abstractInfo.abstractText, '초록 정보 없음'),
    claims: safeExtract(claims, '청구항 정보 없음'),
    ipcCodes: Array.isArray(ipcInfo) ? safeArrayExtract(ipcInfo.map(ipc => ipc.ipcNumber || ipc.ipcCode), '분류 정보 없음') : '분류 정보 없음',
    applicants: Array.isArray(applicantInfo) ? safeArrayExtract(applicantInfo.map(app => app.applicantName), '출원인 정보 없음') : '출원인 정보 없음',
    inventors: Array.isArray(inventorInfo) ? safeArrayExtract(inventorInfo.map(inv => inv.inventorName), '발명자 정보 없음') : '발명자 정보 없음'
  };

  console.log('✅ 추출된 특허 정보 요약:', {
    hasValidTitle: extractedInfo.inventionTitle !== '제목 정보 없음',
    hasValidAbstract: extractedInfo.abstract !== '초록 정보 없음',
    hasValidClaims: extractedInfo.claims !== '청구항 정보 없음',
    applicationNumber: extractedInfo.applicationNumber
  });

  return extractedInfo;
}

// 리포트 타입별 프롬프트 생성
function generateReportPrompt(patentInfo, reportType) {
  const baseInfo = `
특허 정보 요약
### 기본 정보
#### 출원번호
- **${patentInfo.applicationNumber}**
#### 발명의 명칭
- **${patentInfo.inventionTitle}**
#### 출원일 및 등록상태
- **${patentInfo.applicationDate}**, **${patentInfo.registerStatus}**
#### IPC/출원인/발명자
- **${patentInfo.ipcCodes}** / **${patentInfo.applicants}** / **${patentInfo.inventors}**

### 초록(요약)
#### 핵심 기술 설명
- ${patentInfo.abstract}

### 대표 청구항(요약)
#### 권리 범위 요약
- ${patentInfo.claims}
`;

  const roleConstraints = `
# Gemini LLM 특허 분석 보고서 생성 프롬프트 (통제 강화 버전)

## 1. 역할 및 제약 조건 (Role & Constraints)

당신은 **맥킨지/BCG급** 최고 수준의 경영 전략 컨설팅 펌의 **수석 파트너**입니다. 당신의 분석은 **최고 경영진(C-level)**의 투자 결정을 위한 최종 보고서입니다.

1. **톤 앤 매너:** 권위적이고, 극도로 객관적이며, 모든 내용은 데이터 기반으로 작성합니다. 감정적 표현, 추상적 수식어 사용을 엄격히 금지합니다.
2. **헤딩 구조 강제:** 반드시 마크다운 **###**(레벨 3)과 **####**(레벨 4)만 사용합니다. 각 ### 섹션 아래에는 #### 항목을 **최소 3개 이상** 배치합니다.
3. **내용 길이 강제:** 각 **#### 헤딩 바로 아래** 설명은 다음 중 하나를 준수해야 합니다.
   - 최대 **2개의 짧고 독립적인 문장**
   - 또는 **최대 3개의 불릿 포인트**
4. **디자인 강조:** 핵심 용어, 수치, 결론은 **굵게** 처리합니다.
5. **배경 제거:** 트레이딩/개인적 배경 정보는 완전히 배제합니다.
`;

  const part1TechMarket = `
## 3. [Part 1] 기술/시장 심층 구조 분석

### 3.1. 기술 혁신 및 근본적 경쟁 우위
#### 3.1.1. 해결된 핵심 기술 난제
- 발명이 **최초로 제거한 병목 현상**과 **모방 난이도**를 단답형으로 평가
#### 3.1.2. 기존 기술 대비 정량적 성능 지표
- **CoGS 절감률(%)**, **효율 향상(%)**, **통합 용이성**을 수치화하여 제시
#### 3.1.3. 특허 권리 범위 및 방어력 진단
- **원천성 수준(매우 높음/높음/중간/낮음)** 및 **회피 설계 난이도**

### 3.2. 목표 시장 및 기술 확산 전략
#### 3.2.1. 시장 규모 및 성장 잠재력
- **TAM(5년, 금액 단위)**, **확산 속도(기하급수적/선형/더딤)**, **장애 요인 Top3**
#### 3.2.2. 경쟁 환경 및 대체 기술 분석
- **대체 기술의 한계**, **격차 유지 예상 기간**, **3년 내 대형사 진입 가능성**
`;

  const part2BizStrategy = `
## 4. [Part 2] 비즈니스 전략 초점 인사이트

### 4.1. 신사업 기회 및 수익 모델 혁신
#### 4.1.1. 구체적인 신사업 제안
- **프리미엄 제품 포트폴리오**, **구독 기반 서비스 모델**
#### 4.1.2. 최적의 수익 창출 경로
- **권고 수익 모델(B2B/B2G/B2C)**, **기술 로열티율 범위(% 최소~최대)**
#### 4.1.3. 전략적 기술 가치 추정
- **M&A 프리미엄**과 **NPV(5년) 기여도**

### 4.2. 리스크 관리 및 IP 전략
#### 4.2.1. 최우선 R&D 후속 투자 방향
- **상용화 공정 단순화**, **응용 분야 특허 포트폴리오 확장**
#### 4.2.2. 전략적 파트너십/제휴 대상
- **보완/접근성 확보 중 택1 근거**, **파트너십 형태(라이선스/조인트벤처/전략투자)**
#### 4.2.3. 최악의 시나리오 대비 리스크 관리
- **특허 무효화 반격 전략**, **경쟁사의 우회/대체 반격 시나리오**
`;

  // 리포트 타입에 따라 강조 섹션을 달리하되 동일한 엄격한 구조/톤을 유지
  if (reportType === 'market') {
    return `${roleConstraints}\n${baseInfo}\n${part1TechMarket}\n${part2BizStrategy}\n### 출력 지시\n#### 형식 준수\n- 위 구조를 그대로 따르고, 모든 **####** 아래는 규칙을 준수하여 간결하게 작성`;
  }
  // business
  return `${roleConstraints}\n${baseInfo}\n${part2BizStrategy}\n${part1TechMarket}\n### 출력 지시\n#### 형식 준수\n- 위 구조를 그대로 따르고, 모든 **####** 아래는 규칙을 준수하여 간결하게 작성`;
}

// AI 응답을 구조화된 형태로 파싱 - 강화된 검증 및 파싱
function parseReportResult(analysisText, reportType) {
  console.log('🔄 리포트 결과 파싱 시작:', {
    textLength: analysisText?.length || 0,
    reportType,
    hasText: !!analysisText
  });

  // 입력 검증 강화
  if (!analysisText || typeof analysisText !== 'string') {
    console.error('❌ 유효하지 않은 분석 텍스트');
    return createFallbackResult(analysisText, reportType, 'Invalid analysis text');
  }

  const trimmedText = analysisText.trim();
  if (trimmedText.length === 0) {
    console.error('❌ 빈 분석 텍스트');
    return createFallbackResult(analysisText, reportType, 'Empty analysis text');
  }

  if (trimmedText.length < 50) {
    console.warn('⚠️ 분석 텍스트가 너무 짧음 (50자 미만)');
    return createFallbackResult(analysisText, reportType, 'Text too short');
  }

  // 텍스트 품질 검증
  const hasKorean = /[가-힣]/.test(trimmedText);
  const hasStructure = /[#*●■▶]/.test(trimmedText) || /\d+\./.test(trimmedText);
  
  if (!hasKorean && !hasStructure) {
    console.warn('⚠️ 텍스트에 한국어나 구조적 요소가 부족함');
  }

  const sections = [];
  const lines = analysisText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('📝 텍스트 라인 수:', lines.length);

  let currentSection = null;
  let currentContent = [];
  let sectionCount = 0;

  // 다양한 섹션 제목 패턴 정의
  const sectionPatterns = [
    /^###\s+(.+)$/,                   // ### 제목 (강화된 프롬프트 구조)
    /^##\s+(.+)$/,                    // ## 제목
    /^\*\*(.+)\*\*$/,                 // **제목**
    /^\d+\.\s+(.+)$/,                 // 1. 제목
    /^【(.+)】$/,                      // 【제목】
    /^▶\s*(.+)$/,                     // ▶ 제목
    /^■\s*(.+)$/,                     // ■ 제목
    /^●\s*(.+)$/,                     // ● 제목
    /^-\s*(.+):\s*$/,                 // - 제목:
    /^(.+):\s*$/                      // 제목: (마지막에 콜론)
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let isSectionTitle = false;
    let extractedTitle = null;

    // 섹션 제목 패턴 매칭
    for (const pattern of sectionPatterns) {
      const match = line.match(pattern);
      if (match) {
        extractedTitle = match[1].trim();
        // 너무 긴 제목은 섹션으로 간주하지 않음 (100자 제한)
        if (extractedTitle.length <= 100) {
          isSectionTitle = true;
          break;
        }
      }
    }

    if (isSectionTitle && extractedTitle) {
      // 이전 섹션 저장
      if (currentSection && currentContent.length > 0) {
        const content = currentContent.join('\n').trim();
        if (content.length > 0) {
          sections.push({
            title: currentSection,
            content: content,
            wordCount: content.split(/\s+/).length
          });
          sectionCount++;
        }
      }
      
      // 새 섹션 시작
      currentSection = extractedTitle;
      currentContent = [];
      console.log(`📋 섹션 ${sectionCount + 1} 발견: "${extractedTitle}"`);
    } else if (currentSection) {
      // 현재 섹션에 내용 추가
      currentContent.push(line);
    } else {
      // 첫 번째 섹션 제목이 없는 경우, 내용을 임시 저장
      currentContent.push(line);
    }
  }
  
  // 마지막 섹션 저장
  if (currentSection && currentContent.length > 0) {
    const content = currentContent.join('\n').trim();
    if (content.length > 0) {
      sections.push({
        title: currentSection,
        content: content,
        wordCount: content.split(/\s+/).length
      });
      sectionCount++;
    }
  } else if (currentContent.length > 0) {
    // 섹션 제목이 전혀 없는 경우, 전체를 하나의 섹션으로 처리
    const content = currentContent.join('\n').trim();
    sections.push({
      title: reportType === 'market' ? '시장 분석 결과' : '비즈니스 인사이트',
      content: content,
      wordCount: content.split(/\s+/).length
    });
    sectionCount++;
  }
  
  console.log('✅ 파싱 완료:', {
    totalSections: sections.length,
    sectionTitles: sections.map(s => s.title),
    totalWords: sections.reduce((sum, s) => sum + s.wordCount, 0)
  });

  // 최종 검증
  if (sections.length === 0) {
    console.error('❌ 파싱된 섹션이 없음');
    // 마지막 시도: 전체 텍스트를 하나의 섹션으로 처리
    sections.push({
      title: reportType === 'market' ? '시장 분석 결과' : '비즈니스 인사이트',
      content: analysisText.trim(),
      wordCount: analysisText.trim().split(/\s+/).length
    });
  }

  // 각 섹션의 내용이 너무 짧은지 확인
  const validSections = sections.filter(section => section.content.length >= 10);
  if (validSections.length === 0) {
    console.warn('⚠️ 모든 섹션의 내용이 너무 짧음');
  }

  const result = {
    reportType: reportType, // reportType 추가
    sections: validSections.length > 0 ? validSections : sections,
    summary: sections.length > 0 ? 
      sections[0].content.substring(0, 200) + (sections[0].content.length > 200 ? '...' : '') : 
      '요약 정보 없음',
    totalSections: validSections.length > 0 ? validSections.length : sections.length,
    totalWords: sections.reduce((sum, s) => sum + s.wordCount, 0),
    parsedAt: new Date().toISOString()
  };

  console.log('📊 최종 결과:', {
    sections: result.totalSections,
    totalWords: result.totalWords,
    summaryLength: result.summary.length
  });

  return result;
}

// 폴백 결과 생성 함수
function createFallbackResult(originalText, reportType, reason) {
  console.log(`🔄 폴백 결과 생성: ${reason}`);
  
  const fallbackTitle = reportType === 'market' ? '시장 분석 결과' : '비즈니스 인사이트';
  const fallbackContent = originalText && typeof originalText === 'string' && originalText.trim().length > 0 
    ? originalText.trim() 
    : '분석 결과를 생성하는 중 문제가 발생했습니다. 다시 시도해 주세요.';

  // 간단한 섹션 분할 시도
  const sections = [];
  
  if (fallbackContent.length > 100) {
    // 문단별로 분할 시도
    const paragraphs = fallbackContent.split(/\n\s*\n/).filter(p => p.trim().length > 20);
    
    if (paragraphs.length > 1) {
      paragraphs.forEach((paragraph, index) => {
        sections.push({
          title: `${fallbackTitle} ${index + 1}`,
          content: paragraph.trim(),
          wordCount: paragraph.trim().split(/\s+/).length
        });
      });
    } else {
      // 길이로 분할
      const chunkSize = Math.max(200, Math.floor(fallbackContent.length / 3));
      let start = 0;
      let chunkIndex = 1;
      
      while (start < fallbackContent.length) {
        const chunk = fallbackContent.substring(start, start + chunkSize);
        sections.push({
          title: `${fallbackTitle} ${chunkIndex}`,
          content: chunk.trim(),
          wordCount: chunk.trim().split(/\s+/).length
        });
        start += chunkSize;
        chunkIndex++;
      }
    }
  } else {
    // 단일 섹션으로 처리
    sections.push({
      title: fallbackTitle,
      content: fallbackContent,
      wordCount: fallbackContent.split(/\s+/).length
    });
  }

  return {
    reportType: reportType,
    sections: sections,
    summary: fallbackContent.substring(0, 200) + (fallbackContent.length > 200 ? '...' : ''),
    totalSections: sections.length,
    totalWords: sections.reduce((sum, s) => sum + s.wordCount, 0),
    parsedAt: new Date().toISOString(),
    isFallback: true,
    fallbackReason: reason
  };
}