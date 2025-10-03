const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // AI 분석 실행 (타임아웃 60초로 증가)
    console.log('🧠 AI 분석 시작...');
    const timeoutMs = 60000; // 60초로 증가
    
    let analysisText;
    try {
      const analysisPromise = model.generateContent(prompt);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.error('⏰ AI 분석 타임아웃 발생');
          reject(new Error('AI 분석 시간 초과 (60초)'));
        }, timeoutMs);
      });

      console.log('📡 Gemini API 호출 중...');
      const result = await Promise.race([analysisPromise, timeoutPromise]);
      console.log('📡 Gemini API 응답 받음');
      
      const response = await result.response;
      console.log('📄 응답 텍스트 추출 중...');
      analysisText = response.text();
      console.log('✅ 응답 텍스트 추출 완료');
    } catch (apiError) {
      console.error('❌ Gemini API 호출 오류:', {
        message: apiError.message,
        status: apiError.status,
        statusText: apiError.statusText,
        code: apiError.code,
        details: apiError.details
      });
      
      // API 오류를 다시 throw하여 외부 catch에서 처리
      throw apiError;
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
    if (userId) {
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
    market: `
${baseInfo}

위 특허에 대한 상세한 시장 분석 리포트를 작성해주세요. 다음 구조로 작성해주세요:

## 기술의 핵심 가치
이 특허 기술의 핵심적인 가치와 혁신성을 분석해주세요.

## 핵심 목표 시장
이 기술이 적용될 수 있는 주요 시장과 타겟 고객층을 분석해주세요.

## 경쟁 기술 우위
기존 기술 대비 이 특허의 경쟁 우위와 차별화 요소를 분석해주세요.

## 시장 성장 동력 및 위험
시장 성장을 이끌 수 있는 요인들과 잠재적 위험 요소들을 분석해주세요.

## 기술 성숙도 및 시장 매력도 요약
기술의 성숙도와 시장의 매력도를 종합적으로 평가해주세요.

각 섹션은 구체적이고 실용적인 내용으로 작성하되, 전문적이면서도 이해하기 쉽게 작성해주세요.
`,

    business: `
${baseInfo}

위 특허에 대한 상세한 비즈니스 전략 인사이트 리포트를 작성해주세요. 다음 구조로 작성해주세요:

## 새로운 비즈니스 기회
이 특허 기술을 활용한 새로운 비즈니스 모델과 기회를 분석해주세요.

## 경쟁사 대응 전략
경쟁사들의 예상 대응과 이에 대한 전략적 대응 방안을 제시해주세요.

## R&D 및 M&A/파트너십 전략
기술 개발 방향과 전략적 제휴 또는 인수합병 기회를 분석해주세요.

## 제안 수익 모델
이 기술을 기반으로 한 구체적인 수익 창출 모델을 제시해주세요.

## 실행 가능성 평가 및 액션 플랜
비즈니스 실행의 현실성과 단계별 실행 계획을 제시해주세요.

각 섹션은 실행 가능한 전략과 구체적인 액션 아이템을 포함하여 작성해주세요.
`
  };

  return prompts[reportType];
}

// AI 응답을 구조화된 형태로 파싱 - 강화된 검증 및 파싱
function parseReportResult(analysisText, reportType) {
  console.log('🔄 리포트 결과 파싱 시작:', {
    textLength: analysisText?.length || 0,
    reportType,
    hasText: !!analysisText
  });

  // 입력 검증
  if (!analysisText || typeof analysisText !== 'string') {
    console.error('❌ 유효하지 않은 분석 텍스트');
    throw new Error('Invalid analysis text provided');
  }

  if (analysisText.trim().length === 0) {
    console.error('❌ 빈 분석 텍스트');
    throw new Error('Empty analysis text provided');
  }

  const sections = [];
  const lines = analysisText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('📝 텍스트 라인 수:', lines.length);

  let currentSection = null;
  let currentContent = [];
  let sectionCount = 0;

  // 다양한 섹션 제목 패턴 정의
  const sectionPatterns = [
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