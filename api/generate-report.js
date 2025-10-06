const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Supabase 클라이언트 초기화 (강화된 환경변수 처리)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

// 환경변수 디버깅 로그
console.log('🔧 [generate-report.js] 환경변수 상태:', {
  hasUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  urlLength: supabaseUrl?.length || 0,
  keyLength: supabaseServiceKey?.length || 0,
  isVercel: !!process.env.VERCEL,
  nodeEnv: process.env.NODE_ENV
});

try {
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ [generate-report.js] Supabase 클라이언트 초기화 성공');
  } else {
    console.warn('⚠️ [generate-report.js] Supabase 환경변수 누락:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    });
  }
} catch (e) {
  console.error('❌ [generate-report.js] Supabase 클라이언트 초기화 실패:', e?.message || e);
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

  try {
    console.log('=== 리포트 생성 API 요청 시작 ===');
    console.log('Request body:', req.body);

    // 환경변수에서 OpenRouter API 키 가져오기
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      console.error('OpenRouter API key not found in environment variables');
      return res.status(500).json({
        success: false,
        error: 'API configuration error',
        message: 'OpenRouter API key is not configured'
      });
    }

    console.log('OpenRouter API Key found:', apiKey ? 'Yes' : 'No');

    // 요청 데이터 검증 - reportType을 먼저 추출
    const { patentData, reportType, userId } = req.body;
    
    // 서버리스 환경(Vercel 등) 고려한 타임아웃 설정 - 비즈니스 리포트는 더 긴 시간 필요
    const isVercel = !!process.env.VERCEL;
    // 리포트 타입별 차별화된 타임아웃: 비즈니스 리포트는 더 복잡한 분석이 필요
    const TIMEOUT_MS = reportType === 'business' ? 90000 : 60000; // 비즈니스: 90초, 시장분석: 60초
    
    if (!patentData || typeof patentData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing required data',
        message: 'Valid patentData object is required'
      });
    }

    if (!reportType || !['market', 'business'].includes(reportType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report type',
        message: 'reportType must be either "market" or "business"'
      });
    }

    console.log('Report type:', reportType, 'Timeout:', TIMEOUT_MS + 'ms');

    // 특허 정보 추출
    const patentInfo = extractPatentInfo(patentData);
    
    // 추출된 정보 검증
    if (!patentInfo.inventionTitle && !patentInfo.abstract) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient patent data',
        message: '특허 제목 또는 초록 정보가 필요합니다.'
      });
    }

    // 리포트 타입별 프롬프트 생성
    const prompt = generateReportPrompt(patentInfo, reportType);

    // AI 분석 실행 - 비즈니스 리포트는 더 많은 재시도와 긴 대기시간
    console.log('AI analysis starting...');
    const maxRetries = reportType === 'business' ? 4 : 3; // 비즈니스: 4회, 시장분석: 3회
    
    let analysisText;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries} - Calling OpenRouter API (timeout: ${TIMEOUT_MS/1000}s)...`);
        
        const analysisPromise = fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3001',
            'X-Title': 'Patent AI Report Generator'
          },
          body: JSON.stringify({
            model: 'anthropic/claude-3.5-sonnet',
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.8,
            max_tokens: 4096
          })
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`AI analysis timeout (${TIMEOUT_MS/1000}s)`));
          }, TIMEOUT_MS);
        });

        const response = await Promise.race([analysisPromise, timeoutPromise]);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${data.error?.message || response.statusText}`);
        }
        
        analysisText = data.choices?.[0]?.message?.content;
        
        // 응답 검증 - 비즈니스 리포트는 더 엄격한 검증 (500자 이상)
        const minLength = reportType === 'business' ? 500 : 200;
        if (!analysisText || analysisText.trim().length < minLength) {
          console.error('📊 응답 검증 실패 상세 정보:', {
            hasText: !!analysisText,
            length: analysisText?.length || 0,
            trimmedLength: analysisText?.trim().length || 0,
            required: minLength,
            reportType: reportType,
            attempt: attempt
          });
          throw new Error(`Response too short (length: ${analysisText?.length || 0}, required: ${minLength})`);
        }
        
        console.log(`Analysis response validation passed: ${analysisText.length} chars (min: ${minLength})`);
        
        console.log(`Analysis completed (${analysisText.length} chars)`);
        break; // 성공 시 루프 종료
        
      } catch (apiError) {
        lastError = apiError;
        console.error(`Attempt ${attempt}/${maxRetries} failed:`, {
          message: apiError.message,
          status: apiError.status,
          reportType: reportType,
          timeout: TIMEOUT_MS,
          stack: apiError.stack?.split('\n')[0]
        });
        
        // 인증 오류 시 즉시 실패
        if (apiError.status === 401 || apiError.status === 403) {
          console.error('Authentication error - aborting retries');
          throw apiError;
        }
        
        if (attempt === maxRetries) {
          console.error('Max retries reached - throwing last error');
          throw lastError;
        }
        
        // 지수적 백오프: 비즈니스 리포트는 더 긴 대기시간
        const baseDelay = reportType === 'business' ? 3000 : 2000; // 비즈니스: 3초, 시장분석: 2초
        const delay = baseDelay * Math.pow(1.5, attempt - 1); // 지수적 증가
        console.log(`Waiting ${delay/1000}s before retry ${attempt + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // 결과 구조화
    const structuredResult = parseReportResult(analysisText, reportType);
    
    if (!structuredResult || !structuredResult.sections || structuredResult.sections.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Report parsing error',
        message: '리포트 결과를 구조화하는데 실패했습니다.'
      });
    }

    // 활동 추적 (검색 API 패턴 적용)
    if (userId && supabase) {
      try {
        console.log('💾 데이터베이스 저장 시작...');
        
        // AI 분석 활동 추적
        console.log('📝 AI 분석 활동 추적 중...');
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
          console.error('❌ AI 분석 활동 추적 실패:', activityError);
        } else {
          console.log('✅ AI 분석 활동 추적 성공');
        }

        // 보고서 저장 - 새로운 명명 규칙 적용
        const reportName = generateReportName(patentInfo, reportType);
        console.log('📄 보고서 저장 중...', { reportName, userId, reportType });
        
        const { data: reportRecord, error: reportError } = await supabase
          .from('ai_analysis_reports')
          .insert({
            user_id: userId,
            application_number: patentInfo.applicationNumber,
            invention_title: patentInfo.inventionTitle,
            analysis_type: reportType,
            report_name: reportName, // 새로운 명명 규칙 적용
            market_penetration: structuredResult.content?.sections?.[0]?.content || '',
            competitive_landscape: structuredResult.content?.sections?.[1]?.content || '',
            market_growth_drivers: structuredResult.content?.sections?.[2]?.content || '',
            risk_factors: structuredResult.content?.sections?.[3]?.content || '',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (reportError) {
          console.error('❌ 보고서 저장 실패:', reportError);
        } else {
          console.log('✅ 보고서 저장 성공:', reportRecord?.id);
          
          // 보고서 생성 활동 추적
          console.log('📝 보고서 생성 활동 추적 중...');
          const { error: reportActivityError } = await supabase
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

          if (reportActivityError) {
            console.error('❌ 보고서 생성 활동 추적 실패:', reportActivityError);
          } else {
            console.log('✅ 보고서 생성 활동 추적 성공');
          }
        }

      } catch (trackingError) {
        console.error('❌ 데이터베이스 저장 중 오류:', trackingError);
        console.error('❌ 오류 상세:', trackingError.message);
        console.error('❌ 오류 스택:', trackingError.stack);
        // 활동 추적 실패는 리포트 생성에 영향을 주지 않음
      }
    } else {
      console.warn('⚠️ 데이터베이스 저장 건너뜀:', { hasUserId: !!userId, hasSupabase: !!supabase });
    }

    // 성공 응답 (검색 API 패턴 적용)
    console.log('Report generation completed successfully');
    
    res.status(200).json({
      success: true,
      data: {
        reportType,
        content: structuredResult,
        generatedAt: new Date().toISOString(),
        patentInfo: {
          applicationNumber: patentInfo.applicationNumber,
          title: patentInfo.inventionTitle
        }
      }
    });

  } catch (error) {
    console.error('Report generation error:', error.message);
    
    // 에러 타입별 처리 (검색 API 패턴)
    let statusCode = 500;
    let errorMessage = '리포트 생성 중 오류가 발생했습니다.';
    
    if (error.message.includes('timeout')) {
      statusCode = 408;
      const isVercel = !!process.env.VERCEL;
      if (isVercel) {
        errorMessage = `리포트 생성이 시간 초과되었습니다 (서버리스 실행 제한).

해결 방법:
• 페이지를 새로고침 후 재시도해주세요
• 잠시 후 다시 시도해주세요 (서버 부하가 줄어들 수 있습니다)
• 네트워크 상태를 확인해주세요
• 문제가 지속되면 관리자에게 문의해주세요

기술적 정보: 서버리스 환경에서 복잡한 특허 분석은 실행 시간 제한에 걸릴 수 있습니다.`;
      } else {
        errorMessage = 'AI 분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
      }
    } else if (error.status === 401 || error.status === 403) {
      statusCode = 401;
      errorMessage = 'AI 서비스 인증 오류입니다.';
    }

    res.status(statusCode).json({
      success: false,
      error: 'Report generation failed',
      message: errorMessage,
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
# 전문 비즈니스 인사이트 리포트

## 역할 정의 및 분석 프레임워크

당신은 **전문 컨설턴트**로서 기업의 CEO와 이사회를 위한 전략적 의사결정 보고서를 작성합니다. 본 분석은 **수십억 원 규모의 투자 결정**을 좌우하는 최종 보고서입니다.

**중요 지침: 맥킨지, 보스턴컨설팅, 베인앤컴퍼니 등 특정 컨설팅 회사명을 언급하지 마세요. 독립적인 전문 컨설턴트로서 작성하세요.**

### 분석 원칙 및 품질 기준
1. **데이터 기반 객관성:** 모든 주장은 정량적 근거와 시장 데이터로 뒷받침되어야 합니다.
2. **전략적 깊이:** 단순한 현상 분석을 넘어 근본 원인과 장기적 임팩트를 분석합니다.
3. **실행 가능성:** 모든 권고사항은 구체적 실행 계획과 예상 성과를 포함해야 합니다.
4. **리스크 균형:** 기회와 위험을 균형있게 평가하여 현실적 시나리오를 제시합니다.

### 필수 출력 요구사항
- **각 섹션 최소 200-300자:** 표면적 분석이 아닌 심층적 인사이트 제공
- **구체적 수치 포함:** 시장 규모, 성장률, 수익 전망 등 정량적 데이터 필수
- **비교 분석:** 경쟁사, 대체 기술, 유사 사례와의 체계적 비교
- **시나리오 모델링:** 보수적/기본/낙관적 시나리오별 분석
- **액션 아이템:** 6개월/1년/3년 단위의 구체적 실행 계획

### 보고서 구조 및 형식
- **마크다운 헤딩:** ### (주요 섹션), #### (세부 항목) 사용
- **핵심 내용 강조:** 중요한 수치, 결론, 권고사항은 **굵게** 표시
- **논리적 흐름:** 현황 분석 → 기회 평가 → 전략 수립 → 실행 계획 순서
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
## 4. [Part 2] 전문 비즈니스 전략 인사이트

### 4.1. 전략적 기술 가치 평가 및 시장 포지셔닝
#### 4.1.1. 핵심 기술 차별화 요소 및 경쟁 우위
본 특허 기술이 기존 솔루션 대비 달성하는 구체적 성능 개선 지표를 정량적으로 분석하고, 기술적 진입장벽의 높이와 모방 난이도를 평가합니다. 특허 포트폴리오의 방어력과 원천성 수준을 진단하여 지속 가능한 경쟁 우위를 확보할 수 있는지 판단합니다.

#### 4.1.2. 시장 기회 규모 및 성장 잠재력 분석
TAM(Total Addressable Market) 규모를 5년 전망으로 추정하고, 주요 타겟 시장별 침투 전략을 수립합니다. 시장 성장률, 고객 세그먼트별 니즈, 경쟁사 대비 포지셔닝을 종합 분석하여 최적의 시장 진입 전략을 제시합니다.

#### 4.1.3. 경쟁 환경 및 차별화 전략
주요 경쟁사들의 기술 수준과 시장 점유율을 분석하고, 본 특허 기술의 차별화 포인트를 명확히 정의합니다. 대체 기술의 한계점과 기술 격차 유지 가능 기간을 평가하여 경쟁 우위 지속성을 진단합니다.

### 4.2. 비즈니스 모델 혁신 및 수익 창출 전략
#### 4.2.1. 수익 모델 다각화 및 최적화 방안
직접 사업화와 라이선싱 전략을 비교 분석하여 최적의 수익 모델을 제안합니다. B2B, B2G, B2C 각 채널별 수익성과 확장성을 평가하고, 단계별 수익 창출 로드맵(3-5년)을 구체적으로 설계합니다. 예상 수익 규모와 마진 구조를 시나리오별로 모델링합니다.

#### 4.2.2. 전략적 파트너십 및 생태계 구축
핵심 파트너 후보군을 식별하고 각각의 제휴 형태(라이선싱, 조인트벤처, 전략적 투자)별 장단점을 분석합니다. Win-Win 가치 창출 구조를 설계하고, 파트너십을 통한 시장 확장 및 기술 고도화 전략을 수립합니다.

#### 4.2.3. 신사업 기회 발굴 및 포트폴리오 확장
본 특허 기술을 활용한 고부가가치 제품 및 서비스 포트폴리오를 제안합니다. 시장 메가트렌드와 기술적 차별화 요소를 기반으로 프리미엄 제품군과 구독 기반 서비스 모델을 설계하여 지속 가능한 성장 동력을 확보합니다.

#### 4.2.4. 구체적인 신사업 제안 (최소 3개)
각 제안에 대해 다음 항목을 포함하세요: 목표 고객 세그먼트, 제공 가치(정량 지표 포함), 예상 가격/ARPU, 연간 매출 잠재력(억원/백만 USD), 마진 구조, 채널 전략(B2B/B2G/B2C), 초기 실행 리소스 및 파트너.
예시 형식:
- **제안 A: [제품/서비스명]**
  - 대상: [산업/고객]
  - 제공 가치: [효율 개선 %, 비용 절감 %, 성능 향상 %]
  - 가격/ARPU: [숫자]
  - 연매출 잠재력(3년): [숫자]
  - 마진/수익 모델: [라이선스/구독/하드웨어+서비스]
  - 채널/파트너: [주요 파트너/총판]

#### 4.2.5. 최적의 수익 창출 경로 (단계별 로드맵)
직접 사업화 vs 라이선싱의 ROI 비교표를 제시하고, 0-6개월/6-12개월/12-36개월 단계별 KPI와 재무 목표를 제시합니다. 각 단계에 필요한 인력/CapEx/Opex와 리스크 완화 활동을 포함하세요.
예시 KPI: 초기 PoC 수, 파일럿 계약 수, 연간 MRR/라이선스 수익, 고객 유지율, 파트너 확장 수.

### 4.3. 실행 전략 및 리스크 관리 프레임워크
#### 4.3.1. 우선순위 액션 플랜 및 실행 로드맵
6개월, 1년, 3년 단위의 구체적 실행 계획을 수립하고, 각 단계별 필요 투자 규모와 자원 배분 전략을 제시합니다. 핵심 성과 지표(KPI)를 설정하여 진행 상황을 모니터링하고 성과를 측정할 수 있는 체계를 구축합니다.

#### 4.3.2. 리스크 요인 분석 및 대응 전략
기술적, 시장적, 경쟁적 리스크를 체계적으로 분석하고, 각 리스크별 구체적 대응 방안을 수립합니다. 특허 무효화 위험, 경쟁사의 우회 설계, 시장 변화 등 주요 위협 요소에 대한 선제적 대응 전략과 최악 시나리오 대비 플랜 B를 제시합니다.

#### 4.3.3. R&D 투자 방향 및 IP 포트폴리오 강화
상용화 공정 최적화와 응용 분야 확장을 위한 후속 R&D 투자 우선순위를 제시합니다. 특허 포트폴리오 강화 전략과 IP 방어 체계 구축 방안을 수립하여 기술적 경쟁 우위를 지속적으로 확대해 나갈 수 있는 전략을 제안합니다.

### 4.4. 투자 가치 평가 및 재무적 임팩트 분석
#### 4.4.1. 기술 가치 평가 및 벤치마킹
DCF(현금흐름할인) 모델을 기반으로 본 특허 기술의 경제적 가치를 정량적으로 추정합니다. 유사 기술의 시장 거래 사례와 로열티 계약을 벤치마킹하여 적정 기술 가치 범위를 산정하고, 라이선싱 수익 전망을 제시합니다.

#### 4.4.2. 투자 수익률 분석 및 재무 모델링
예상 ROI와 투자 회수 기간을 시나리오별로 분석하고, 보수적/기본/낙관적 시나리오에 따른 재무 모델을 구축합니다. 투자 대비 기대 수익 구조를 명확히 하여 투자 의사결정을 지원하는 정량적 근거를 제공합니다.

#### 4.4.3. M&A 가치 및 전략적 옵션 평가
본 특허 기술이 M&A 시장에서 갖는 프리미엄 가치를 평가하고, 전략적 인수 후보군을 식별합니다. 기술 매각, 라이선싱, 조인트벤처 등 다양한 전략적 옵션의 장단점을 비교 분석하여 최적의 Exit 전략을 제안합니다.
#### 4.4.4. 재무 모델 스냅샷 (시나리오별)
보수/기본/낙관 3개 시나리오에 대해 연매출, 영업이익, FCF, ROI, 회수기간, 기술 가치(DCF/로열티) 범위를 표 또는 리스트로 요약합니다.
`;

  // 리포트 타입에 따라 강조 섹션을 달리하되 동일한 엄격한 구조/톤을 유지
  if (reportType === 'market') {
    return `${roleConstraints}\n${baseInfo}\n${part1TechMarket}\n${part2BizStrategy}\n### 출력 지시\n#### 형식 준수\n- 위 구조를 그대로 따르고, 모든 **####** 하위 항목을 **충분히 상세하게 작성** (최소 2-3문장, 정량 수치와 구체적 사례 포함).`;
  }
  // business
  return `${roleConstraints}\n${baseInfo}\n${part2BizStrategy}\n${part1TechMarket}\n### 출력 지시\n#### 형식 준수\n- 위 구조를 그대로 따르고, 모든 **####** 하위 항목을 **충분히 상세하게 작성** (최소 2-3문장, 정량 수치와 구체적 사례 포함).`;
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

// 리포트 이름 생성 함수를 추가
function generateReportName(patentInfo, reportType) {
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
  
  // 특허 제목 정리 (특수문자 제거, 길이 제한)
  let cleanTitle = patentInfo.inventionTitle || '특허분석';
  cleanTitle = cleanTitle.replace(/[^\w\s가-힣]/g, '').trim(); // 특수문자 제거
  if (cleanTitle.length > 30) {
    cleanTitle = cleanTitle.substring(0, 30) + '...';
  }
  
  // 분석 타입 한글 변환
  const analysisTypeMap = {
    'market': '시장분석',
    'business': '인사이트'
  };
  const analysisType = analysisTypeMap[reportType] || '분석';
  
  // 특허번호 정리
  const patentNumber = patentInfo.applicationNumber || 'Unknown';
  
  // 형식: "특허제목_분석타입_특허번호_날짜"
  return `${cleanTitle}_${analysisType}_${patentNumber}_${currentDate}`;
}