import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

export default async function handler(req, res) {
  // 🔍 DEBUG: 함수 호출 추적
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`🔍 [DEBUG] generate-report.js 함수 호출 시작 - RequestID: ${requestId}, 시간: ${new Date().toISOString()}`);
  
  // 리포트 ID 저장용 변수 (함수 전체에서 사용)
  let savedReportId = null;
  
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
    const startTime = Date.now(); // 리포트 생성 시작 시간 기록
    console.log('=== 리포트 생성 API 요청 시작 ===');
    console.log('Request body:', req.body);

    // 🔧 중요한 환경변수들 검증
    console.log('🔧 [환경변수 검증] 상세 정보:', {
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      geminiKeyLength: process.env.GEMINI_API_KEY?.length || 0,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseServiceKey,
      supabaseClientStatus: supabase ? 'initialized' : 'null',
      isVercel: !!process.env.VERCEL,
      nodeEnv: process.env.NODE_ENV
    });

    // Supabase 클라이언트 검증
    if (!supabase) {
      console.error('❌ [CRITICAL] Supabase 클라이언트가 초기화되지 않음');
      return res.status(500).json({
        success: false,
        error: 'Database configuration error',
        message: 'Database connection is not available'
      });
    }

    // 환경변수에서 Gemini API 키 가져오기
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ [CRITICAL] Gemini API key not found in environment variables');
      return res.status(500).json({
        success: false,
        error: 'API configuration error',
        message: 'Gemini API key is not configured'
      });
    }

    // API 키 유효성 기본 검증
    if (apiKey.length < 10 || !apiKey.startsWith('AIza')) {
      console.error('❌ [CRITICAL] Gemini API key appears to be invalid:', {
        length: apiKey.length,
        prefix: apiKey.substring(0, 4)
      });
      return res.status(500).json({
        success: false,
        error: 'API configuration error',
        message: 'Gemini API key format is invalid'
      });
    }

    console.log('✅ Gemini API Key validated:', {
      hasKey: true,
      length: apiKey.length,
      prefix: apiKey.substring(0, 4) + '...'
    });

    // 요청 데이터 검증 - reportType을 먼저 추출
    const { patentData, reportType, userId: rawUserId } = req.body;
    
    // 🔍 DEBUG: rawUserId 값 확인
    console.log('🔍 [DEBUG] rawUserId 값:', {
      rawUserId: rawUserId,
      type: typeof rawUserId,
      hasAt: rawUserId && rawUserId.includes('@'),
      length: rawUserId ? rawUserId.length : 0
    });
    
    // userId가 이메일인 경우 UUID로 변환
    let userId = rawUserId;
    if (rawUserId && rawUserId.includes('@')) {
      console.log('📧 이메일로 사용자 검색 중:', rawUserId);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', rawUserId)
        .single();
      
      if (userError) {
        console.error('❌ 사용자 검색 실패:', userError);
        return res.status(400).json({
          success: false,
          error: 'User not found',
          message: '사용자를 찾을 수 없습니다.'
        });
      }
      
      userId = userData.id;
      console.log(`📧 이메일로 사용자 찾음: ${rawUserId} -> ${userId}`);
    }
    
    // 🔍 DEBUG: 원본 특허 데이터 로깅
    console.log('🔍 [DEBUG] 원본 특허 데이터 수신:', {
      hasPatentData: !!patentData,
      patentDataType: typeof patentData,
      patentDataKeys: patentData ? Object.keys(patentData) : [],
      reportType,
      userId
    });

    // 🔍 DEBUG: 특허 데이터 전체 구조 로깅 (JSON 형태로)
    console.log('🔍 [DEBUG] 특허 데이터 전체 구조:', JSON.stringify(patentData, null, 2));

    // 🔍 DEBUG: 특허 데이터 중요 필드 확인
    if (patentData) {
      console.log('🔍 [DEBUG] 특허 데이터 중요 필드 분석:', {
        // 직접 필드들
        directApplicationNumber: patentData.applicationNumber,
        directInventionTitle: patentData.inventionTitle,
        directAbstract: patentData.abstract,
        directClaims: patentData.claims,
        
        // biblioSummaryInfoArray 구조 확인
        hasBiblioSummaryInfoArray: !!patentData.biblioSummaryInfoArray,
        biblioSummaryInfoArrayType: typeof patentData.biblioSummaryInfoArray,
        biblioSummaryInfoArrayLength: Array.isArray(patentData.biblioSummaryInfoArray) ? patentData.biblioSummaryInfoArray.length : 'not array',
        
        // biblioSummaryInfo 구조 확인 (단일 객체)
        hasBiblioSummaryInfo: !!patentData.biblioSummaryInfo,
        biblioSummaryInfoType: typeof patentData.biblioSummaryInfo,
        
        // 기타 정보들
        hasAbstractInfo: !!patentData.abstractInfo,
        hasClaimInfo: !!patentData.claimInfo,
        hasIpcInfo: !!patentData.ipcInfo,
        hasApplicantInfo: !!patentData.applicantInfo,
        hasInventorInfo: !!patentData.inventorInfo
      });

      // biblioSummaryInfoArray가 있는 경우 첫 번째 요소 확인
      if (patentData.biblioSummaryInfoArray && Array.isArray(patentData.biblioSummaryInfoArray) && patentData.biblioSummaryInfoArray.length > 0) {
        const firstBiblio = patentData.biblioSummaryInfoArray[0];
        console.log('🔍 [DEBUG] biblioSummaryInfoArray[0] 구조:', {
          keys: Object.keys(firstBiblio || {}),
          applicationNumber: firstBiblio?.applicationNumber,
          inventionTitle: firstBiblio?.inventionTitle,
          applicationDate: firstBiblio?.applicationDate,
          registerStatus: firstBiblio?.registerStatus
        });
      }

      // biblioSummaryInfo가 있는 경우 확인
      if (patentData.biblioSummaryInfo) {
        console.log('🔍 [DEBUG] biblioSummaryInfo 구조:', {
          keys: Object.keys(patentData.biblioSummaryInfo),
          applicationNumber: patentData.biblioSummaryInfo.applicationNumber,
          inventionTitle: patentData.biblioSummaryInfo.inventionTitle,
          applicationDate: patentData.biblioSummaryInfo.applicationDate,
          registerStatus: patentData.biblioSummaryInfo.registerStatus
        });
      }
    }
    
    // 서버리스 환경(Vercel 등) 고려한 타임아웃 설정 - Vercel 제한에 맞춰 최적화
    const isVercel = !!process.env.VERCEL;
    // Vercel 함수 타임아웃 제한(60초)을 고려한 안전한 타임아웃 설정
    const TIMEOUT_MS = isVercel ? 45000 : 120000; // Vercel: 45초, 로컬: 120초
    
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
    
    // 🔍 DEBUG: 생성된 프롬프트 로깅
    console.log('🔍 [DEBUG] 생성된 프롬프트 정보:', {
      promptLength: prompt?.length || 0,
      reportType,
      patentTitle: patentInfo.inventionTitle,
      patentNumber: patentInfo.applicationNumber,
      promptPreview: prompt?.substring(0, 500) + '...',
      promptContainsPatentTitle: prompt?.includes(patentInfo.inventionTitle),
      promptContainsPatentNumber: prompt?.includes(patentInfo.applicationNumber)
    });
    
    // 🔍 DEBUG: 프롬프트 전체 내용 (개발 환경에서만)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [DEBUG] 전체 프롬프트 내용:\n', prompt);
    }

    // AI 분석 실행 - Vercel 환경에서는 재시도 횟수 제한
    console.log('🚀 AI analysis starting...', {
      reportType,
      maxRetries: isVercel ? 2 : 3,
      timeoutMs: TIMEOUT_MS,
      patentTitle: patentInfo.inventionTitle,
      patentNumber: patentInfo.applicationNumber,
      isVercel
    });
    const maxRetries = isVercel ? 2 : 3; // Vercel: 2회, 로컬: 3회
    
    let analysisText = null; // catch 블록에서도 접근 가능하도록 초기화
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🚀 [시도 ${attempt}/${maxRetries}] Gemini API 호출 시작:`, {
          timeout: `${TIMEOUT_MS/1000}초`,
          model: isVercel ? 'gemini-2.5-flash' : 'gemini-2.5-flash',
          maxTokens: isVercel ? 4096 : 8192,
          patentNumber: patentInfo.applicationNumber,
          reportType
        });
        
        // ⚠️ 중요: gemini-2.5-flash 모델 하드코딩 - 절대 변경 금지
        // 이 모델은 성능과 안정성이 검증되었으므로 다른 모델로 변경하지 마세요
        // 환경변수나 조건문으로 변경할 수 없도록 완전히 하드코딩됨
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = 'gemini-2.5-flash'; // 하드코딩된 모델명 - 변경 금지
        
        let model;
        try {
          model = genAI.getGenerativeModel({ model: modelName });
          console.log(`✅ Gemini 모델 초기화 성공: ${modelName}`);
        } catch (modelError) {
          console.error('❌ Gemini 모델 초기화 실패:', modelError.message);
          throw new Error(`Model initialization failed: ${modelError.message}`);
        }
        
        const analysisPromise = model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7, // 창의적이고 심도있는 분석을 위해 증가
            maxOutputTokens: isVercel ? 8192 : 12288, // 더 상세한 리포트를 위해 토큰 수 대폭 증가
            topK: 40, // 더 다양한 표현을 위해 증가
            topP: 0.95, // 더 풍부한 내용을 위해 증가
          },
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`AI analysis timeout (${TIMEOUT_MS/1000}s)`));
          }, TIMEOUT_MS);
        });

        console.log(`⏱️ API 호출 시작 - 타임아웃: ${TIMEOUT_MS/1000}초`);
        const result = await Promise.race([analysisPromise, timeoutPromise]);
        
        if (!result) {
          throw new Error('Gemini API error: No result received');
        }
        
        if (!result.response) {
          console.error('❌ Gemini API 응답 구조 오류:', {
            hasResult: !!result,
            resultKeys: result ? Object.keys(result) : [],
            resultType: typeof result
          });
          throw new Error('Gemini API error: No response in result');
        }
        
        try {
          analysisText = result.response.text();
          console.log('✅ Gemini API 응답 텍스트 추출 성공');
        } catch (textError) {
          console.error('❌ 응답 텍스트 추출 실패:', textError.message);
          throw new Error(`Failed to extract response text: ${textError.message}`);
        }
        console.log('🤖 Gemini API 응답 받음:', {
          length: analysisText?.length || 0,
          preview: analysisText?.substring(0, 200) + '...',
          reportType: reportType,
          attempt: attempt,
          modelUsed: modelName
        });
        
        // 🔍 DEBUG: AI 응답이 올바른 특허 정보를 사용하는지 확인
        const patentValidation = {
          patentTitle: patentInfo.inventionTitle,
          patentNumber: patentInfo.applicationNumber,
          responseContainsPatentTitle: analysisText?.includes(patentInfo.inventionTitle),
          responseContainsPatentNumber: analysisText?.includes(patentInfo.applicationNumber),
          responseContainsBatteryKeywords: analysisText?.includes('배터리') || analysisText?.includes('전해질'),
          responseContainsSwimmingKeywords: analysisText?.includes('수영') || analysisText?.includes('보조장치') || analysisText?.includes('오리발'),
          responseFirstLines: analysisText?.split('\n').slice(0, 5).join('\n')
        };
        
        console.log('🔍 [DEBUG] AI 응답 특허 정보 검증:', patentValidation);
        
        // 특허 정보 일치성 검증 강화
        const hasPatentTitle = patentValidation.responseContainsPatentTitle;
        const hasPatentNumber = patentValidation.responseContainsPatentNumber;
        
        if (!hasPatentTitle && !hasPatentNumber) {
          console.warn('⚠️ [WARNING] AI 응답에 특허 정보가 포함되지 않음:', {
            expectedTitle: patentInfo.inventionTitle,
            expectedNumber: patentInfo.applicationNumber,
            responsePreview: analysisText?.substring(0, 300)
          });
        }
        
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
        
        // 상세한 에러 로깅 - 디버깅을 위한 추가 정보
        console.error(`❌ [시도 ${attempt}/${maxRetries}] AI 분석 실패:`, {
          errorType: apiError.name || 'Unknown',
          message: apiError.message,
          status: apiError.status,
          reportType: reportType,
          timeout: `${TIMEOUT_MS/1000}초`,
          patentNumber: patentInfo.applicationNumber,
          patentTitle: patentInfo.inventionTitle?.substring(0, 50) + '...',
          promptLength: prompt?.length || 0,
          isTimeoutError: apiError.message?.includes('timeout'),
          isRateLimitError: apiError.status === 429,
          isAuthError: apiError.status === 401 || apiError.status === 403,
          stack: apiError.stack?.split('\n')[0]
        });
        
        // 특정 에러 타입별 처리
        if (apiError.status === 401 || apiError.status === 403) {
          console.error('🔐 인증 오류 - 재시도 중단');
          throw apiError;
        }
        
        if (apiError.status === 429) {
          console.error('🚫 API 요청 한도 초과 - 더 긴 대기 시간 적용');
        }
        
        if (apiError.message?.includes('timeout')) {
          console.error(`⏰ 타임아웃 오류 - ${TIMEOUT_MS/1000}초 초과`);
        }
        
        if (attempt === maxRetries) {
          console.error('🔄 최대 재시도 횟수 도달 - 최종 실패');
          throw lastError;
        }
        
        // 지수적 백오프: 에러 타입에 따른 차별화된 대기 시간
        let baseDelay = reportType === 'business' ? 3000 : 2000;
        if (apiError.status === 429) baseDelay *= 2; // 요청 한도 초과 시 더 긴 대기
        if (apiError.message?.includes('timeout')) baseDelay *= 1.5; // 타임아웃 시 약간 더 긴 대기
        
        const delay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), 15000); // 최대 15초
        console.log(`⏳ ${delay/1000}초 대기 후 재시도 ${attempt + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // 결과 구조화
    console.log('🔄 파싱 시작 - 원본 텍스트 길이:', analysisText?.length || 0);
    const structuredResult = parseReportResult(analysisText, reportType);
    console.log('📋 파싱 완료 - 구조화된 결과:', {
      sectionsCount: structuredResult?.sections?.length || 0,
      sections: structuredResult?.sections?.map(s => ({
        title: s.title,
        contentLength: s.content?.length || 0,
        contentPreview: s.content?.substring(0, 100) + '...'
      })) || []
    });
    
    if (!structuredResult || !structuredResult.sections || structuredResult.sections.length === 0) {
      console.warn('⚠️ 파싱 실패 - 폴백 결과 생성 중...');
      
      // 폴백 결과 생성 - 원본 텍스트를 단일 섹션으로 반환
      const fallbackResult = createFallbackResult(analysisText, reportType, 'parsing_failed');
      
      console.log('🔄 폴백 결과 생성됨:', {
        sectionsCount: fallbackResult?.sections?.length || 0,
        hasContent: !!(fallbackResult?.sections?.[0]?.content)
      });
      
      // 폴백 결과도 비어있다면 에러 반환
      if (!fallbackResult || !fallbackResult.sections || fallbackResult.sections.length === 0) {
        return res.status(500).json({
          success: false,
          error: 'Report generation failed',
          message: '리포트 생성에 실패했습니다. 잠시 후 다시 시도해주세요.'
        });
      }
      
      // 폴백 결과 사용
      structuredResult = fallbackResult;
    }

    console.log('🚀 데이터베이스 저장 로직 진입점 도달!');
    console.log('🔍 현재 변수 상태:', {
      hasStructuredResult: !!structuredResult,
      structuredResultSections: structuredResult?.sections?.length || 0,
      hasUserId: !!userId,
      userIdValue: userId,
      hasSupabase: !!supabase
    });

    // 활동 추적 (검색 API 패턴 적용)
    console.log('🔍 데이터베이스 저장 조건 확인:', {
      hasUserId: !!userId,
      userId: userId,
      hasSupabase: !!supabase,
      supabaseStatus: supabase ? 'initialized' : 'null'
    });
    
    if (userId && supabase) {
      console.log('✅ 데이터베이스 저장 조건 만족 - 저장 시작');
      try {
        console.log('💾 데이터베이스 저장 시작...');
        
        // 중복 제거: ai_analysis 활동 추적 제거 (report_generate에서 통합 처리)

        console.log('🔄 다음 단계: 보고서 저장 시작...');
        console.log('🔍 보고서 저장 전 상태 확인:', {
          hasStructuredResult: !!structuredResult,
          sectionsCount: structuredResult?.sections?.length || 0,
          hasPatentInfo: !!patentInfo,
          patentNumber: patentInfo?.applicationNumber,
          reportType: reportType
        });

        // 보고서 저장 - 새로운 명명 규칙 적용
        const reportName = generateReportName(patentInfo, reportType);
        console.log('📄 보고서 저장 중...', { reportName, userId, reportType });
        
        console.log('💾 데이터베이스 저장 중... structuredResult:', JSON.stringify(structuredResult, null, 2));
        
        console.log('🔍 ai_analysis_reports 저장 시도 중...');
        
        // 🔒 중복 방지 로직: 동일한 application_number + analysis_type + user_id 조합 체크
        console.log('🔍 중복 체크 시작:', {
          application_number: patentInfo.applicationNumber,
          analysis_type: reportType,
          user_id: userId
        });
        
        const { data: existingReport, error: duplicateCheckError } = await supabase
          .from('ai_analysis_reports')
          .select('id, created_at, report_name')
          .eq('user_id', userId)
          .eq('application_number', patentInfo.applicationNumber)
          .eq('analysis_type', reportType)
          .single();
        
        if (duplicateCheckError && duplicateCheckError.code !== 'PGRST116') {
          // PGRST116은 "no rows returned" 에러로, 중복이 없다는 의미
          console.error('❌ 중복 체크 실패:', duplicateCheckError);
          return res.status(500).json({
            success: false,
            error: 'Database error',
            message: '중복 체크 중 오류가 발생했습니다.'
          });
        }
        
        if (existingReport) {
          console.log('⚠️ 중복 리포트 발견:', {
            existingId: existingReport.id,
            existingCreatedAt: existingReport.created_at,
            existingReportName: existingReport.report_name
          });
          
          // 개발/테스트 환경에서는 기존 리포트를 삭제하고 새로 생성
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 개발 환경 - 기존 리포트 삭제 후 새로 생성');
            
            // 기존 리포트 삭제
            const { error: deleteError } = await supabase
              .from('ai_analysis_reports')
              .delete()
              .eq('id', existingReport.id);
            
            if (deleteError) {
              console.error('❌ 기존 리포트 삭제 실패:', deleteError);
            } else {
              console.log('✅ 기존 리포트 삭제 성공');
            }
            
            // 관련 활동 기록도 삭제
            const { error: activityDeleteError } = await supabase
              .from('user_activities')
              .delete()
              .eq('activity_type', 'report_generate')
              .eq('activity_data->>report_id', existingReport.id);
            
            if (activityDeleteError) {
              console.warn('⚠️ 관련 활동 기록 삭제 실패:', activityDeleteError);
            } else {
              console.log('✅ 관련 활동 기록 삭제 성공');
            }
          } else {
            // 프로덕션 환경에서는 중복 오류 반환
            return res.status(409).json({
              success: false,
              error: 'Duplicate report',
              message: `이미 동일한 특허(${patentInfo.applicationNumber})에 대한 ${reportType} 분석 리포트가 존재합니다.`,
              data: {
                existingReportId: existingReport.id,
                existingReportName: existingReport.report_name,
                createdAt: existingReport.created_at,
                applicationNumber: patentInfo.applicationNumber,
                reportType: reportType
              }
            });
          }
        }
        
        console.log('✅ 중복 체크 통과 - 새 리포트 생성 진행');
        
        // 기술 분야 분류 (classify_technology_field 함수 사용)
        const searchText = `${patentInfo.inventionTitle} ${patentInfo.abstract}`;
        const ipcCodes = patentInfo.ipcCodes ? (Array.isArray(patentInfo.ipcCodes) ? patentInfo.ipcCodes : [patentInfo.ipcCodes]) : [];
        const cpcCodes = patentInfo.cpcCodes ? (Array.isArray(patentInfo.cpcCodes) ? patentInfo.cpcCodes : [patentInfo.cpcCodes]) : [];
        
        const { data: classificationResult, error: classificationError } = await supabase
          .rpc('classify_technology_field', {
            p_search_text: searchText,
            p_ipc_codes: ipcCodes,
            p_cpc_codes: cpcCodes
          });

        let technologyField = '기타';
        let fieldConfidence = 0.5;
        
        if (!classificationError && classificationResult) {
          technologyField = classificationResult.technology_field || '기타';
          fieldConfidence = classificationResult.confidence || 0.5;
        } else {
          console.warn(`⚠️ 기술 분야 분류 실패:`, classificationError);
          // 폴백: 로컬 분류 함수 사용
          const localFields = extractTechnologyFields(patentInfo);
          technologyField = localFields[0] || '기타';
        }

        console.log('🔍 [DEBUG] 분류된 기술 분야:', {
          technologyField,
          fieldConfidence,
          ipcCodes,
          cpcCodes
        });
        
        // 리포트 타입에 따른 데이터 구조 분기 (실제 DB 스키마에 맞게 수정)
        let insertData = {
          user_id: userId,
          application_number: patentInfo.applicationNumber,
          invention_title: patentInfo.inventionTitle, // DB 스키마에 맞는 필드명 사용
          analysis_type: reportType,
          report_name: reportName,
          technology_field: technologyField, // 단일 기술 분야
          field_confidence: fieldConfidence, // 분류 신뢰도
          ipc_codes: ipcCodes, // IPC 코드 배열
          technology_fields: [technologyField] // 기존 호환성을 위한 배열 형태
        };
        
        console.log('🔍 [DEBUG] 저장할 데이터 필드 확인:', {
          invention_title: insertData.invention_title,
          report_name: insertData.report_name,
          application_number: insertData.application_number,
          analysis_type: insertData.analysis_type
        });

        // 리포트 타입별 필드 매핑
        if (reportType === 'market') {
          // 시장분석 리포트 필드
          insertData.market_penetration = structuredResult.sections?.[0]?.content || '';
          insertData.competitive_landscape = structuredResult.sections?.[1]?.content || '';
          insertData.market_growth_drivers = structuredResult.sections?.[2]?.content || '';
          insertData.risk_factors = structuredResult.sections?.[3]?.content || '';
        } else if (reportType === 'business') {
          // 비즈니스 인사이트 리포트 필드
          insertData.revenue_model = structuredResult.sections?.[0]?.content || '';
          insertData.royalty_margin = structuredResult.sections?.[1]?.content || '';
          insertData.new_business_opportunities = structuredResult.sections?.[2]?.content || '';
          insertData.competitor_response_strategy = structuredResult.sections?.[3]?.content || '';
        }
        
        console.log('📝 저장할 데이터 (리포트 타입별 매핑 완료):', JSON.stringify(insertData, null, 2));
        
        // 재시도 로직이 포함된 DB 저장 함수 호출
        console.log('🔄 saveReportWithRetry 함수 호출 시작...');
        savedReportId = await saveReportWithRetry(insertData, userId, patentInfo, reportType);
        console.log('🔍 [DEBUG] saveReportWithRetry 함수 완료 - 반환된 savedReportId:', savedReportId);

      } catch (trackingError) {
        console.error('❌ 데이터베이스 저장 중 오류:', trackingError);
        console.error('❌ 오류 상세:', trackingError.message);
        console.error('❌ 오류 스택:', trackingError.stack);
        // 활동 추적 실패는 리포트 생성에 영향을 주지 않음
      }
    } else {
      console.warn('⚠️ 데이터베이스 저장 건너뜀:', { 
        hasUserId: !!userId, 
        userId: userId,
        hasSupabase: !!supabase,
        reason: !userId ? 'userId 없음' : !supabase ? 'supabase 없음' : '알 수 없음'
      });
    }

    // 중복 제거: 위에서 이미 report_history에 저장했으므로 여기서는 제거

    // 성공 응답 (검색 API 패턴 적용)
    console.log('✅ Report generation completed successfully');
    console.log('📤 최종 응답 구조:', JSON.stringify({
      reportType,
      sections: structuredResult.sections,
      generatedAt: new Date().toISOString()
    }, null, 2));
    
    console.log(`🔍 [DEBUG] generate-report.js 함수 완료 - RequestID: ${requestId}, 시간: ${new Date().toISOString()}`);
    
    console.log('🔍 [DEBUG] 최종 응답 전 savedReportId 상태:', {
      savedReportId: savedReportId,
      hasUserId: !!userId,
      hasSupabase: !!supabase
    });

    res.status(200).json({
      success: true,
      data: {
        reportId: savedReportId, // 저장된 리포트 ID 추가
        reportType,
        ...structuredResult,
        generatedAt: new Date().toISOString(),
        patentInfo: {
          applicationNumber: patentInfo.applicationNumber,
          title: patentInfo.inventionTitle
        },
        // 이벤트 디스패치를 위한 정보 추가
        shouldDispatchEvent: true,
        eventData: {
          type: 'reportGenerated',
          reportId: savedReportId, // 이벤트 데이터에도 리포트 ID 추가
          reportType: reportType,
          reportTitle: generateReportName(patentInfo, reportType),
          patentNumber: patentInfo.applicationNumber,
          patentTitle: patentInfo.inventionTitle,
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    // 🔍 상세한 오류 로깅 - 디버깅을 위한 완전한 정보
    console.error('❌ [CRITICAL] Report generation error - 상세 정보:', {
      errorType: error.constructor.name,
      message: error.message,
      status: error.status,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substr(2, 9),
      environment: {
        isVercel: !!process.env.VERCEL,
        nodeEnv: process.env.NODE_ENV,
        hasSupabase: !!supabase,
        hasGeminiKey: !!process.env.GEMINI_API_KEY
      },
      requestData: {
        reportType,
        hasPatentData: !!patentData,
        hasUserId: !!userId,
        patentNumber: patentData?.applicationNumber || 'unknown'
      }
    });
    
    // 부분 응답이 있는 경우 저장 시도
    let partialResult = null;
    if (typeof analysisText === 'string' && analysisText.length > 100) {
      console.log('🔄 부분 응답 감지 - 부분 결과 저장 시도:', {
        partialLength: analysisText.length,
        preview: analysisText.substring(0, 200) + '...'
      });
      
      try {
        // 부분 응답도 파싱 시도
        partialResult = parseReportResult(analysisText, reportType);
        
        // 부분 결과가 있으면 데이터베이스에 저장
        if (partialResult && userId && supabase) {
          const patentInfo = extractPatentInfo(patentData);
          const reportName = generateReportName(patentInfo, reportType) + '_부분응답';
          
          // 부분 결과를 위한 데이터 구조 생성
          let partialInsertData = {
            user_id: userId,
            application_number: patentInfo.applicationNumber,
            invention_title: patentInfo.inventionTitle,
            analysis_type: reportType,
            report_name: reportName,
            technology_field: '기타',
            field_confidence: 0.5,
            ipc_codes: patentInfo.ipcCodes || [],
            technology_fields: ['기타']
          };

          // 리포트 타입별 필드 매핑 (부분 결과)
          if (reportType === 'market') {
            partialInsertData.market_penetration = partialResult.sections?.[0]?.content || '부분 응답 - 완료되지 않음';
            partialInsertData.competitive_landscape = partialResult.sections?.[1]?.content || '';
            partialInsertData.market_growth_drivers = partialResult.sections?.[2]?.content || '';
            partialInsertData.risk_factors = partialResult.sections?.[3]?.content || '';
          } else if (reportType === 'business') {
            partialInsertData.revenue_model = partialResult.sections?.[0]?.content || '부분 응답 - 완료되지 않음';
            partialInsertData.royalty_margin = partialResult.sections?.[1]?.content || '';
            partialInsertData.new_business_opportunities = partialResult.sections?.[2]?.content || '';
            partialInsertData.competitor_response_strategy = partialResult.sections?.[3]?.content || '';
          }
          
          const { data: partialReportRecord, error: partialReportError } = await supabase
            .from('ai_analysis_reports')
            .insert(partialInsertData);
            
          if (!partialReportError) {
            console.log('✅ 부분 응답 저장 성공:', partialReportRecord?.id);
          }
        }
      } catch (partialError) {
        console.error('❌ 부분 응답 저장 실패:', partialError.message);
      }
    }
    
    // 에러 타입별 상세 처리
    let statusCode = 500;
    let errorMessage = '리포트 생성 중 오류가 발생했습니다.';
    let errorDetails = {};
    
    // 타임아웃 오류
    if (error.message.includes('timeout')) {
      statusCode = 408;
      errorDetails.errorType = 'timeout';
      const isVercel = !!process.env.VERCEL;
      if (isVercel) {
        errorMessage = `리포트 생성이 시간 초과되었습니다 (서버리스 실행 제한: ${TIMEOUT_MS/1000}초).

해결 방법:
• 페이지를 새로고침 후 재시도해주세요
• 잠시 후 다시 시도해주세요 (서버 부하가 줄어들 수 있습니다)
• 네트워크 상태를 확인해주세요
• 문제가 지속되면 관리자에게 문의해주세요

기술적 정보: 서버리스 환경에서 복잡한 특허 분석은 실행 시간 제한에 걸릴 수 있습니다.`;
      } else {
        errorMessage = 'AI 분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
      }
      
      // 부분 결과가 있으면 사용자에게 알림
      if (partialResult) {
        errorMessage += '\n\n📋 부분 결과가 저장되었습니다. 보고서 목록에서 확인하실 수 있습니다.';
      }
    } 
    // 인증 오류
    else if (error.status === 401 || error.status === 403 || error.message.includes('API key')) {
      statusCode = 401;
      errorDetails.errorType = 'authentication';
      errorMessage = 'AI 서비스 인증 오류입니다. 관리자에게 문의해주세요.';
    }
    // API 한도 초과
    else if (error.status === 429) {
      statusCode = 429;
      errorDetails.errorType = 'rate_limit';
      errorMessage = 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    }
    // 모델 초기화 오류
    else if (error.message.includes('Model initialization failed')) {
      statusCode = 500;
      errorDetails.errorType = 'model_initialization';
      errorMessage = 'AI 모델 초기화에 실패했습니다. 잠시 후 다시 시도해주세요.';
    }
    // 데이터베이스 연결 오류
    else if (error.message.includes('Database connection')) {
      statusCode = 500;
      errorDetails.errorType = 'database_connection';
      errorMessage = '데이터베이스 연결 오류입니다. 관리자에게 문의해주세요.';
    }
    // 기타 오류
    else {
      errorDetails.errorType = 'unknown';
      errorDetails.originalMessage = error.message;
    }

    // 응답 전송
    res.status(statusCode).json({
      success: false,
      error: 'Report generation failed',
      message: errorMessage,
      timestamp: new Date().toISOString(),
      hasPartialResult: !!partialResult,
      details: errorDetails
    });
  }
};

// 특허 데이터에서 주요 정보 추출 - 강화된 null/undefined 처리
function extractPatentInfo(patentData) {
  console.log('🔍 [extractPatentInfo] 함수 시작 - 입력 데이터:', {
    hasPatentData: !!patentData,
    patentDataType: typeof patentData,
    patentDataKeys: patentData ? Object.keys(patentData) : [],
    hasBiblioArray: !!(patentData?.biblioSummaryInfoArray),
    hasAbstractArray: !!(patentData?.abstractInfoArray)
  });

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

  // 다양한 데이터 구조 지원을 위한 유연한 추출
  let biblioInfo = {};
  let abstractInfo = {};
  let claimInfo = {};
  let ipcInfo = [];
  let applicantInfo = [];
  let inventorInfo = [];

  // 🔍 DEBUG: 데이터 구조 분석 시작
  console.log('🔍 [extractPatentInfo] 데이터 구조 분석 시작:', {
    hasBiblioSummaryInfoArray: !!patentData.biblioSummaryInfoArray,
    hasBiblioSummaryInfo: !!patentData.biblioSummaryInfo,
    hasDirectFields: !!(patentData.applicationNumber || patentData.inventionTitle)
  });

  // PatentDetail 페이지에서 오는 데이터 구조 처리 (biblioSummaryInfoArray)
  if (patentData.biblioSummaryInfoArray && patentData.biblioSummaryInfoArray.biblioSummaryInfo) {
    console.log('🔍 [extractPatentInfo] biblioSummaryInfoArray 구조 처리');
    biblioInfo = patentData.biblioSummaryInfoArray.biblioSummaryInfo;
    abstractInfo = patentData.abstractInfoArray?.abstractInfo || {};
    claimInfo = patentData.claimInfoArray?.claimInfo || {};
    ipcInfo = patentData.ipcInfoArray?.ipcInfo || [];
    applicantInfo = patentData.applicantInfoArray?.applicantInfo || [];
    inventorInfo = patentData.inventorInfoArray?.inventorInfo || [];
  }
  // 배열 형태의 biblioSummaryInfoArray 처리 (이전 버전 호환성)
  else if (patentData.biblioSummaryInfoArray && Array.isArray(patentData.biblioSummaryInfoArray) && patentData.biblioSummaryInfoArray.length > 0) {
    console.log('🔍 [extractPatentInfo] biblioSummaryInfoArray 배열 구조 처리');
    const firstBiblio = patentData.biblioSummaryInfoArray[0];
    biblioInfo = firstBiblio || {};
    abstractInfo = patentData.abstractInfoArray?.[0] || patentData.abstractInfo || {};
    claimInfo = patentData.claimInfoArray?.[0] || patentData.claimInfo || {};
    ipcInfo = patentData.ipcInfoArray || patentData.ipcInfo || [];
    applicantInfo = patentData.applicantInfoArray || patentData.applicantInfo || [];
    inventorInfo = patentData.inventorInfoArray || patentData.inventorInfo || [];
  }
  // 직접 특허 데이터가 전달된 경우 (KIPRIS API 응답)
  else if (patentData.biblioSummaryInfo) {
    console.log('🔍 [extractPatentInfo] biblioSummaryInfo 구조 처리');
    biblioInfo = patentData.biblioSummaryInfo;
    abstractInfo = patentData.abstractInfo || {};
    claimInfo = patentData.claimInfo || {};
    ipcInfo = patentData.ipcInfo || [];
    applicantInfo = patentData.applicantInfo || [];
    inventorInfo = patentData.inventorInfo || [];
  }
  // 단순화된 특허 데이터가 전달된 경우
  else if (patentData.applicationNumber || patentData.inventionTitle) {
    console.log('🔍 [extractPatentInfo] 직접 필드 구조 처리');
    biblioInfo = {
      applicationNumber: patentData.applicationNumber,
      inventionTitle: patentData.inventionTitle,
      inventionTitleEng: patentData.inventionTitleEng,
      applicationDate: patentData.applicationDate,
      registerStatus: patentData.registerStatus
    };
    abstractInfo = {
      abstractTextKor: patentData.astrtCont || patentData.abstract,
      abstractText: patentData.abstract || patentData.astrtCont
    };
    claimInfo = {
      claimTextKor: patentData.claims || patentData.claimScope,
      claimScope: patentData.claimScope || patentData.claims
    };
  }
  // 기타 구조의 데이터 처리
  else {
    console.log('🔍 [extractPatentInfo] 기타 구조 처리');
    biblioInfo = patentData;
    abstractInfo = patentData;
    claimInfo = patentData;
  }

  // 🔍 DEBUG: 추출된 기본 정보 로깅
  console.log('🔍 [extractPatentInfo] 추출된 기본 정보:', {
    biblioInfoKeys: Object.keys(biblioInfo),
    abstractInfoKeys: Object.keys(abstractInfo),
    claimInfoKeys: Object.keys(claimInfo),
    biblioInfo: {
      applicationNumber: biblioInfo.applicationNumber,
      inventionTitle: biblioInfo.inventionTitle,
      applicationDate: biblioInfo.applicationDate
    }
  });

  console.log('📊 특허 데이터 원본 구조:', {
    keys: Object.keys(patentData || {}),
    hasTitle: !!(biblioInfo?.inventionTitle),
    hasAbstract: !!(abstractInfo?.abstractTextKor || abstractInfo?.abstractText || abstractInfo?.astrtCont),
    hasClaims: !!(claimInfo?.claimTextKor || claimInfo?.claimScope || claimInfo?.claims),
    dataStructureType: patentData.biblioSummaryInfo ? 'KIPRIS_API' : 'SIMPLIFIED'
  });

  // claimInfo 처리 - 다양한 형식 지원
  let claims = '';
  if (Array.isArray(claimInfo)) {
    claims = claimInfo.map(claim => claim.claimScope || claim.claimTextKor || '').join('\n');
  } else if (claimInfo.claimTextKor) {
    claims = claimInfo.claimTextKor;
  } else if (claimInfo.claimScope) {
    claims = claimInfo.claimScope;
  } else if (claimInfo.claims) {
    claims = claimInfo.claims;
  }

  // 초록 정보 추출 - 다양한 필드명 지원
  const abstract = abstractInfo.abstractTextKor || 
                  abstractInfo.abstractText || 
                  abstractInfo.astrtCont || 
                  patentData.astrtCont || 
                  patentData.abstract || '';

  // 특허명 추출 - 다양한 필드명 시도
  let inventionTitle = biblioInfo.inventionTitle || 
                      patentData.inventionTitle || 
                      biblioInfo.title || 
                      patentData.title ||
                      biblioInfo.invention_title ||
                      patentData.invention_title;
  
  // 특허명이 여전히 없으면 더 깊이 탐색
  if (!inventionTitle && patentData.biblioSummaryInfoArray) {
    if (patentData.biblioSummaryInfoArray.biblioSummaryInfo) {
      inventionTitle = patentData.biblioSummaryInfoArray.biblioSummaryInfo.inventionTitle;
    } else if (Array.isArray(patentData.biblioSummaryInfoArray) && patentData.biblioSummaryInfoArray[0]) {
      inventionTitle = patentData.biblioSummaryInfoArray[0].inventionTitle;
    }
  }

  console.log('🔍 [DEBUG] 특허명 추출 과정:', {
    biblioTitle: biblioInfo.inventionTitle,
    patentDataTitle: patentData.inventionTitle,
    finalTitle: inventionTitle,
    hasTitle: !!inventionTitle
  });

  const extractedInfo = {
    applicationNumber: safeExtract(biblioInfo.applicationNumber || patentData.applicationNumber),
    inventionTitle: safeExtract(inventionTitle, '제목 정보 없음'),
    inventionTitleEng: safeExtract(biblioInfo.inventionTitleEng || patentData.inventionTitleEng),
    applicationDate: normalizeDateString(biblioInfo.applicationDate || patentData.applicationDate),
    registerStatus: safeExtract(biblioInfo.registerStatus || patentData.registerStatus),
    abstract: safeExtract(abstract, '초록 정보 없음'),
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

  // 🔍 DEBUG: 추출된 특허 정보 상세 로깅
  console.log('🔍 [DEBUG] 추출된 특허 정보 상세:', {
    applicationNumber: extractedInfo.applicationNumber,
    inventionTitle: extractedInfo.inventionTitle,
    inventionTitleEng: extractedInfo.inventionTitleEng,
    applicationDate: extractedInfo.applicationDate,
    registerStatus: extractedInfo.registerStatus,
    abstractLength: extractedInfo.abstract?.length || 0,
    abstractPreview: extractedInfo.abstract?.substring(0, 200) + '...',
    claimsLength: extractedInfo.claims?.length || 0,
    claimsPreview: extractedInfo.claims?.substring(0, 200) + '...',
    ipcCodes: extractedInfo.ipcCodes,
    applicants: extractedInfo.applicants,
    inventors: extractedInfo.inventors
  });

  return extractedInfo;
}

// 리포트 타입별 프롬프트 생성 - Vercel 최적화 간결 버전
function generateReportPrompt(patentInfo, reportType) {
  // Vercel 환경에서는 더 간결한 프롬프트 사용
  const isVercel = !!process.env.VERCEL;
  
  if (isVercel) {
    return `# ${reportType === 'market' ? '시장분석' : '비즈니스 인사이트'} 리포트

**특허**: ${patentInfo.applicationNumber} - ${patentInfo.inventionTitle}
**초록**: ${patentInfo.abstract}
**청구항**: ${patentInfo.claims}

**⚠️ 중요: 토큰 제한 내에서 모든 섹션을 완전히 작성하세요**

다음 구조로 간결하게 분석하세요:

## 1. 기술 혁신성
- 핵심 기술 특징 (2-3개 포인트)
- 기존 기술 대비 개선점

## 2. 시장 분석  
- 시장 규모 및 성장률 (구체적 수치)
- 경쟁 환경

## 3. 비즈니스 전략
- 수익 모델
- 사업화 전략 (3개 제안)

## 4. 투자 가치
- ROI 분석
- 리스크 평가

## 5. 결론 및 권고사항
- 핵심 결론
- 실행 권고사항

**📏 작성 지침:**
- 각 섹션을 간결하게 작성 (핵심 내용만)
- 구체적 수치와 데이터 포함
- 반드시 결론 섹션까지 완성
- 토큰 제한을 고려하여 길이 조절`;
  }

  const baseInfo = `
🎯 **분석 대상 특허**
- **출원번호**: ${patentInfo.applicationNumber}
- **발명명칭**: ${patentInfo.inventionTitle}
- **출원일**: ${patentInfo.applicationDate}
- **등록상태**: ${patentInfo.registerStatus}
- **출원인**: ${patentInfo.applicants}
- **IPC 분류**: ${patentInfo.ipcCodes}
- **초록**: ${patentInfo.abstract}
- **대표 청구항**: ${patentInfo.claims}

🚨 **중요**: 위 특허 정보만을 기반으로 분석하세요.
`;

  const roleConstraints = `
# 전문 ${reportType === 'market' ? '시장분석' : '비즈니스 인사이트'} 리포트

**분석 대상**: ${patentInfo.applicationNumber} - ${patentInfo.inventionTitle}
**역할**: 전문 컨설턴트로서 CEO/이사회용 전략적 의사결정 보고서 작성

### 핵심 요구사항
1. 제공된 특허 정보만 사용 (가상 기술 언급 금지)
2. 구체적 수치 포함 (시장 규모, 성장률, 수익 전망)
3. 실행 가능한 전략과 계획 제시
4. 리스크와 기회의 균형있는 평가
`;

  const analysisStructure = `
## 분석 구조

### 1. 기술 혁신성 분석
- 핵심 기술 특징 및 차별화 요소
- 기존 기술 대비 개선점 (정량적 지표 포함)
- 특허 권리 범위 및 방어력

### 2. 시장 분석
- 시장 규모 및 성장 잠재력 (TAM/SAM/SOM)
- 경쟁 환경 및 포지셔닝
- 타겟 고객 세그먼트 및 가치 제안

### 3. 비즈니스 전략
- 수익 모델 및 사업화 전략
- 전략적 파트너십 기회
- 신사업 기회 발굴 (최소 3개 구체적 제안)

### 4. 투자 가치 평가
- 기술 가치 평가 및 ROI 분석
- 상용화 가능성 및 리스크 평가
- 시나리오별 재무 전망 (보수/기본/낙관)
`;

  const outputRequirements = `
## 출력 요구사항

### 필수 포함 내용
1. **특허 정보 명시**: ${patentInfo.applicationNumber} - ${patentInfo.inventionTitle}
2. **구체적 수치**: 시장 규모, 성장률, 수익 전망 등
3. **신사업 제안**: 최소 3개의 구체적 사업 아이디어
4. **재무 분석**: 보수/기본/낙관 시나리오별 전망
5. **실행 계획**: 6개월/1년/3년 단위 로드맵

### 금지사항
- 다른 특허나 가상 기술 언급 금지
- 일반적인 기술 트렌드만 언급 금지
- 특허 정보 불충분 면책 조항 사용 금지

### 리포트 구조
각 섹션을 상세히 작성하되, 간결하고 실용적으로 구성하세요.
`;

  const finalInstructions = `
### 🚨 최종 확인 지침 🚨

**🎯 분석 대상 특허 (다시 한번 확인):**
- **특허번호**: ${patentInfo.applicationNumber}
- **발명명칭**: ${patentInfo.inventionTitle}
- **초록**: ${patentInfo.abstract?.substring(0, 100)}...

**⛔ 절대 금지사항:**
1. 다른 특허나 기술에 대한 언급 절대 금지
2. 가상의 기술이나 예시 기술 사용 절대 금지
3. "AI 기반 자율형 정밀 농업 로봇" 등 관련 없는 기술 언급 절대 금지
4. 특허 정보가 불충분하다는 면책 조항 사용 절대 금지
5. 일반적인 기술 트렌드만 언급하는 것 절대 금지

**✅ 필수 준수사항:**
1. 반드시 위에 제공된 특허 정보만 사용
2. 특허번호와 발명명칭을 리포트에 명시적으로 포함
3. 제공된 초록과 청구항 내용을 기반으로 분석
4. 구체적이고 실질적인 시장 분석 제공

### 📝 출력 지시
#### 형식 준수
- 위 구조를 그대로 따르고, 모든 **####** 하위 항목을 **충분히 상세하게 작성** (최소 2-3문장, 정량 수치와 구체적 사례 포함).

### 🚨 완전한 리포트 작성 필수 지침 🚨

**⚠️ 중요: 반드시 모든 섹션을 완성하여 완전한 리포트를 작성하세요**

1. **완전성 보장**: 모든 섹션(기술혁신성, 시장분석, 투자가치, 결론 등)을 반드시 포함하여 완전한 분석을 제공하세요.

2. **중단 방지**: 리포트가 중간에 끊어지지 않도록 주의하세요. 각 섹션의 길이를 조절하되, 모든 필수 섹션을 포함하세요.

3. **결론까지 완성**: 결론 섹션까지 반드시 포함하여 완전한 분석을 제공하세요. 리포트는 명확한 결론과 권고사항으로 마무리되어야 합니다.

4. **품질 유지**: 길이 조절을 위해 품질을 희생하지 마세요. 핵심 내용은 유지하면서 간결하고 명확하게 작성하세요.

5. **토큰 효율성**: 주어진 토큰 제한 내에서 모든 섹션을 완성하기 위해 각 섹션을 간결하게 작성하되, 핵심 내용은 반드시 포함하세요.

6. **마무리 필수**: 리포트는 반드시 "#### 결론 및 권고사항" 섹션으로 마무리되어야 하며, 이 섹션이 누락되면 안 됩니다.

### 📝 작성 우선순위
1. 모든 주요 섹션 헤더(####) 포함
2. 각 섹션당 최소 2-3문장의 핵심 내용
3. 구체적 수치나 데이터 포함
4. 결론 섹션까지 완전히 작성
`;

  // 간소화된 프롬프트 조합
  return `${roleConstraints}\n${baseInfo}\n${analysisStructure}\n${outputRequirements}

**🎯 최종 지시사항**: 위 구조에 따라 완전한 ${reportType === 'market' ? '시장분석' : '비즈니스 인사이트'} 리포트를 작성하세요. 

**⚠️ 토큰 제한 내 완전한 리포트 작성 필수:**
1. 모든 주요 섹션을 반드시 포함하되, 각 섹션을 간결하게 작성
2. 토큰 제한을 고려하여 핵심 내용 위주로 구성
3. 리포트가 중간에 끊어지지 않도록 길이 조절
4. 반드시 "#### 결론 및 권고사항" 섹션으로 마무리
5. 완전하지 않은 리포트는 절대 제출하지 말 것

**📏 작성 가이드라인:**
- 각 주요 섹션: 2-3개 핵심 포인트로 간결하게
- 구체적 수치나 데이터는 필수 포함
- 불필요한 설명이나 반복 내용 제거
- 결론까지 완전히 작성하여 실용적인 리포트 완성`;
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
  // 현재 날짜시간을 YYYYMMDD_HHMMSS 형식으로 생성
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const dateTime = `${year}${month}${day}_${hours}${minutes}${seconds}`;
  
  console.log('🔍 [generateReportName] 입력 데이터:', {
    patentInfo: patentInfo,
    inventionTitle: patentInfo?.inventionTitle,
    applicationNumber: patentInfo?.applicationNumber,
    reportType: reportType,
    dateTime: dateTime
  });
  
  // 특허 제목 정리 (특수문자 제거, 공백을 언더스코어로 변경, 길이 제한)
  let cleanTitle = patentInfo?.inventionTitle || '특허분석';
  
  // undefined나 null 체크
  if (!cleanTitle || cleanTitle === 'undefined' || cleanTitle === '제목 정보 없음') {
    cleanTitle = '특허분석';
  }
  
  // 특수문자 제거하고 공백을 언더스코어로 변경
  cleanTitle = String(cleanTitle)
    .replace(/[^\w\s가-힣]/g, '') // 특수문자 제거
    .replace(/\s+/g, '_') // 공백을 언더스코어로 변경
    .trim();
  
  if (cleanTitle.length > 20) {
    cleanTitle = cleanTitle.substring(0, 20);
  }
  
  // 분석 타입 영문 변환 (요구사항에 맞게)
  const analysisTypeMap = {
    'market': 'market_analysis',
    'business': 'business_insight'
  };
  const analysisType = analysisTypeMap[reportType] || 'analysis';
  
  // 특허번호 정리
  let patentNumber = patentInfo?.applicationNumber || 'Unknown';
  if (!patentNumber || patentNumber === 'undefined') {
    patentNumber = 'Unknown';
  }
  
  // 새로운 형식: "(특허명)_(특허번호)_market_analysis_datetime" 또는 "(특허명)_(특허번호)_business_insight_datetime"
  const reportName = `${cleanTitle}_${patentNumber}_${analysisType}_${dateTime}`;
  
  console.log('🔍 [generateReportName] 생성된 리포트명:', reportName);
  
  return reportName;
}

// 기술 분야 추출 함수
function extractTechnologyFields(patentInfo) {
  console.log('🔍 [extractTechnologyFields] 함수 시작:', patentInfo);
  
  const technologyFields = [];
  
  // IPC 코드에서 기술 분야 추출
  if (patentInfo.ipcCodes && patentInfo.ipcCodes !== '분류 정보 없음') {
    const ipcCodes = Array.isArray(patentInfo.ipcCodes) ? patentInfo.ipcCodes : [patentInfo.ipcCodes];
    
    ipcCodes.forEach(ipcCode => {
      if (ipcCode && typeof ipcCode === 'string') {
        const field = mapIpcToTechnologyField(ipcCode);
        if (field && !technologyFields.includes(field)) {
          technologyFields.push(field);
        }
      }
    });
  }
  
  // 특허 제목과 초록에서 키워드 기반 기술 분야 추출
  const textContent = `${patentInfo.inventionTitle || ''} ${patentInfo.abstract || ''}`.toLowerCase();
  const keywordFields = extractFieldsFromKeywords(textContent);
  
  keywordFields.forEach(field => {
    if (!technologyFields.includes(field)) {
      technologyFields.push(field);
    }
  });
  
  // 기본값 설정
  if (technologyFields.length === 0) {
    technologyFields.push('기타');
  }
  
  console.log('🔍 [extractTechnologyFields] 추출된 기술 분야:', technologyFields);
  return technologyFields;
}

// IPC 코드를 기술 분야로 매핑
function mapIpcToTechnologyField(ipcCode) {
  if (!ipcCode) return null;
  
  const ipcPrefix = ipcCode.substring(0, 1).toUpperCase();
  
  const ipcMapping = {
    'A': '생활필수품',
    'B': '처리조작/운수',
    'C': '화학/야금',
    'D': '섬유/지류',
    'E': '고정구조물',
    'F': '기계공학/조명/가열/무기/폭파',
    'G': '물리학',
    'H': '전기'
  };
  
  return ipcMapping[ipcPrefix] || '기타';
}

// 키워드 기반 기술 분야 추출
function extractFieldsFromKeywords(textContent) {
  const fields = [];
  
  const keywordMapping = {
    '인공지능': 'AI/ML',
    'ai': 'AI/ML',
    '머신러닝': 'AI/ML',
    '딥러닝': 'AI/ML',
    '블록체인': '블록체인',
    'blockchain': '블록체인',
    '자율주행': '자동차',
    '자동차': '자동차',
    'automotive': '자동차',
    '5g': '통신',
    '통신': '통신',
    'communication': '통신',
    'iot': 'IoT',
    '사물인터넷': 'IoT',
    '반도체': '반도체',
    'semiconductor': '반도체',
    '배터리': '에너지',
    'battery': '에너지',
    '태양광': '에너지',
    'solar': '에너지',
    '바이오': '바이오/의료',
    'bio': '바이오/의료',
    '의료': '바이오/의료',
    'medical': '바이오/의료',
    '로봇': '로봇',
    'robot': '로봇'
  };
  
  Object.entries(keywordMapping).forEach(([keyword, field]) => {
    if (textContent.includes(keyword.toLowerCase()) && !fields.includes(field)) {
      fields.push(field);
    }
  });
  
  return fields;
}

// 재시도 로직이 포함된 리포트 저장 함수
async function saveReportWithRetry(insertData, userId, patentInfo, reportType) {
  const maxRetries = 3;
  let lastError = null;
  let savedReportId = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [saveReportWithRetry] 시도 ${attempt}/${maxRetries}`);
      
      // 🔍 DEBUG: 저장 시도 전 로그
      console.log(`🔍 [saveReportWithRetry] 시도 ${attempt} - ai_analysis_reports 저장 시도 시작:`, new Date().toISOString());
      console.log(`🔍 [saveReportWithRetry] 시도 ${attempt} - 저장 데이터 요약:`, {
        user_id: insertData.user_id,
        application_number: insertData.application_number,
        analysis_type: insertData.analysis_type,
        report_name: insertData.report_name
      });
      
      const { data: reportRecord, error: reportError } = await supabase
        .from('ai_analysis_reports')
        .insert(insertData)
        .select()
        .single();
      
      if (reportError) {
        throw new Error(`ai_analysis_reports 삽입 실패: ${reportError.message}`);
      }
      
      savedReportId = reportRecord?.id;
      console.log(`✅ [saveReportWithRetry] 시도 ${attempt} - 보고서 저장 성공:`, savedReportId);
      
      // 리포트 히스토리는 ai_analysis_reports 테이블로 통합됨
      console.log(`📋 [saveReportWithRetry] 시도 ${attempt} - 리포트 히스토리는 ai_analysis_reports 테이블에 통합 저장됨`);
      
      // 보고서 생성 활동 추적
      console.log(`📝 [saveReportWithRetry] 시도 ${attempt} - 보고서 생성 활동 추적 중...`);
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
        throw new Error(`user_activities 삽입 실패: ${reportActivityError.message}`);
      }
      
      console.log(`✅ [saveReportWithRetry] 시도 ${attempt} - 보고서 생성 활동 추적 성공`);
      console.log(`📊 [saveReportWithRetry] 시도 ${attempt} - users 테이블 total_reports는 트리거에 의해 자동 증가됩니다.`);
      
      return savedReportId; // 성공 시 함수 종료
      
    } catch (error) {
      lastError = error;
      console.error(`❌ [saveReportWithRetry] 시도 ${attempt}/${maxRetries} 실패:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 지수 백오프: 2초, 4초, 8초
        console.log(`⏳ [saveReportWithRetry] ${delay}ms 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 모든 재시도 실패
  console.error(`❌ [saveReportWithRetry] 모든 재시도 실패. 마지막 오류:`, lastError?.message || lastError);
  console.error(`❌ [saveReportWithRetry] 저장 시도한 데이터:`, JSON.stringify(insertData, null, 2));
  
  // 리포트 저장 실패 시에도 리포트 생성은 계속 진행 (사용자에게 결과 제공)
  return null;
}