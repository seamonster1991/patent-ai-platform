import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

// 간단한 메모리 캐시 (서버리스 환경에서는 제한적이지만 동일 요청 내에서는 유효)// 캐시 관리
const analysisCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5분 캐시

// 캐시 클리어 (맥킨지 언급 제거를 위해)
analysisCache.clear();

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ Supabase 클라이언트 초기화 완료');
} else {
  console.warn('⚠️ Supabase 환경변수가 설정되지 않음 - DB 저장 기능 비활성화');
}

// 캐시 초기화 (디버깅용) - 제거됨
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 캐시 무효화 헤더 추가
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // 캐시 초기화 제거됨 (정상 운영)
  
  // 버전 정보 추가 (디버깅용) - 강제 캐시 무효화
  const version = '2.4-FIXED-PARSING-' + Date.now();
  console.log('🚀 AI Analysis API v' + version);
  console.log('🔧 Environment:', process.env.VERCEL ? 'Vercel' : 'Local');
  console.log('🕒 Timestamp:', new Date().toISOString());
  
  // 환경변수 상태 확인
  console.log('🔧 환경변수 상태:', {
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    geminiKeyLength: process.env.GEMINI_API_KEY?.length || 0,
    isVercel: !!process.env.VERCEL,
    nodeEnv: process.env.NODE_ENV
  });
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only POST method is allowed'
    });
  }

  try {
    console.log('🔍 Step 1: 사용자 인증 확인');
    // Authorization 헤더에서 JWT 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authorization token is required'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Supabase로 사용자 인증 확인
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
        message: 'Database connection not available'
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('❌ 사용자 인증 실패:', authError);
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Authentication failed'
      });
    }

    console.log('✅ 사용자 인증 성공:', user.id);

    console.log('🔍 Step 2: API 키 확인 시작');
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    console.log('🔍 Step 3: 요청 데이터 파싱 시작');
    const { patentData, analysisType = 'comprehensive' } = req.body;
    
    // 🔍 DEBUG: 받은 데이터 구조 상세 로깅
    console.log('📥 받은 patentData 구조:');
    console.log('- patentData 타입:', typeof patentData);
    console.log('- patentData 키들:', patentData ? Object.keys(patentData) : 'null');
    if (patentData) {
      console.log('- biblioSummaryInfoArray 존재:', !!patentData.biblioSummaryInfoArray);
      if (patentData.biblioSummaryInfoArray) {
        console.log('- biblioSummaryInfo 존재:', !!patentData.biblioSummaryInfoArray.biblioSummaryInfo);
        if (patentData.biblioSummaryInfoArray.biblioSummaryInfo) {
          const biblio = patentData.biblioSummaryInfoArray.biblioSummaryInfo;
          console.log('- applicationNumber:', biblio.applicationNumber);
          console.log('- inventionTitle:', biblio.inventionTitle);
          console.log('- abstract 관련 키들:', Object.keys(patentData).filter(key => key.toLowerCase().includes('abstract')));
          console.log('- claim 관련 키들:', Object.keys(patentData).filter(key => key.toLowerCase().includes('claim')));
        }
      }
    }
    
    if (!patentData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required data',
        message: 'patentData is required'
      });
    }

    // 특허 정보 추출 (키 누락 시에도 동작)
    const patentInfo = extractPatentInfo(patentData);
    
    // 🔍 DEBUG: 추출된 특허 정보 로깅
    console.log('📊 추출된 특허 정보:');
    console.log('- applicationNumber:', patentInfo.applicationNumber);
    console.log('- inventionTitle:', patentInfo.inventionTitle);
    console.log('- abstract 길이:', patentInfo.abstract?.length || 0);
    console.log('- claims 길이:', patentInfo.claims?.length || 0);

    // 🔍 Step 4: 포인트 차감 처리
    console.log('💰 포인트 차감 처리 시작');
    
    // 분석 타입에 따른 포인트 차감량 결정
    let reportType;
    let pointsRequired;
    
    if (analysisType === 'market_analysis' || analysisType === 'market') {
      reportType = 'market_analysis';
      pointsRequired = 400;
    } else if (analysisType === 'business_insight' || analysisType === 'business' || analysisType === 'comprehensive') {
      reportType = 'business_insight';
      pointsRequired = 600;
    } else {
      // 기본값은 business_insight
      reportType = 'business_insight';
      pointsRequired = 600;
    }

    console.log(`💰 리포트 타입: ${reportType}, 필요 포인트: ${pointsRequired}`);

    // 중복 요청 방지를 위한 요청 ID 생성
    const requestId = `${user.id}_${patentInfo.applicationNumber}_${reportType}_${Date.now()}`;
    
    try {
      // FEFO 포인트 차감 실행
      const { data: deductResult, error: deductError } = await supabase
        .rpc('deduct_points_fefo', {
          p_user_id: user.id,
          p_points: pointsRequired,
          p_report_type: reportType,
          p_request_id: requestId
        });

      if (deductError) {
        console.error('❌ 포인트 차감 실패:', deductError);
        
        // 잔액 부족 오류 처리
        if (deductError.message?.includes('insufficient') || deductError.message?.includes('부족')) {
          return res.status(400).json({
            success: false,
            error: 'Insufficient points',
            message: `포인트가 부족합니다. ${reportType === 'market_analysis' ? '시장 분석' : '비즈니스 인사이트'} 리포트 생성에는 ${pointsRequired} 포인트가 필요합니다.`,
            requiredPoints: pointsRequired,
            reportType: reportType
          });
        }
        
        // 중복 요청 오류 처리
        if (deductError.message?.includes('duplicate') || deductError.message?.includes('중복')) {
          return res.status(409).json({
            success: false,
            error: 'Duplicate request',
            message: '동일한 요청이 이미 처리 중입니다. 잠시 후 다시 시도해주세요.'
          });
        }
        
        // 기타 오류
        return res.status(500).json({
          success: false,
          error: 'Point deduction failed',
          message: '포인트 차감 중 오류가 발생했습니다.'
        });
      }

      console.log('✅ 포인트 차감 성공:', deductResult);
      
    } catch (error) {
      console.error('❌ 포인트 차감 처리 중 예외 발생:', error);
      return res.status(500).json({
        success: false,
        error: 'Point deduction error',
        message: '포인트 차감 처리 중 오류가 발생했습니다.'
      });
    }

    // 🔧 DEBUGGING: 캐시 비활성화 및 Gemini API 강제 사용
    console.log('🔍 Step 5: Gemini API 키 상태 확인');
    console.log('- API 키 존재:', !!geminiApiKey);
    console.log('- API 키 길이:', geminiApiKey?.length || 0);
    console.log('- API 키 시작 부분:', geminiApiKey?.substring(0, 10) || 'N/A');
    
    // 🔧 Gemini API 키가 없거나 무효인 경우: 캐시/스켈레톤 리포트로 graceful fallback
    if (!geminiApiKey || geminiApiKey.includes('JKJKJK') || geminiApiKey.length < 30) {
      console.warn('⚠️ Gemini API 키가 유효하지 않음. 캐시된 리포트 또는 스켈레톤 리포트로 대체합니다.');

      // 🔧 DEBUG: 캐시 조회 비활성화 (디버깅용)
      console.log('🔧 DEBUG: 캐시 조회를 건너뛰고 스켈레톤 리포트 생성');
      console.log('🔧 DEBUG: 추출된 특허 정보로 스켈레톤 리포트 생성:', {
        applicationNumber: patentInfo.applicationNumber,
        inventionTitle: patentInfo.inventionTitle,
        abstractLength: patentInfo.abstract?.length || 0,
        claimsLength: patentInfo.claims?.length || 0
      });
      
      // 1) 캐시된 리포트 조회 (Supabase) - 디버깅을 위해 비활성화
      let cachedReport = null;
      // */
      
      // 3) 캐시가 없다면 스켈레톤 리포트 생성 (요약 중심) - 실제 특허 정보 사용
      console.log('ℹ️ 캐시 없음 - 실제 특허 정보로 스켈레톤 리포트 생성');
      const sections = [];
      
      // 실제 특허 정보가 있는 경우에만 추가
      if (patentInfo.applicationNumber && patentInfo.applicationNumber !== '') {
        sections.push({
          title: '특허 번호',
          content: patentInfo.applicationNumber
        });
      }
      
      if (patentInfo.inventionTitle && patentInfo.inventionTitle !== '') {
        sections.push({
          title: '발명의 명칭',
          content: patentInfo.inventionTitle
        });
      }
      
      if (patentInfo.abstract && patentInfo.abstract.length > 0) {
        sections.push({
          title: '특허 요약',
          content: patentInfo.abstract.slice(0, 800)
        });
      }
      
      if (patentInfo.claims && patentInfo.claims.length > 0) {
        sections.push({
          title: '주요 청구항(발췌)',
          content: patentInfo.claims.slice(0, 800)
        });
      }
      
      // 기본 메시지 추가
      sections.push({
        title: '분석 상태',
        content: `특허 ${patentInfo.applicationNumber || 'UNKNOWN'} "${patentInfo.inventionTitle || 'Untitled Patent'}"에 대한 AI 분석을 위해서는 Gemini API 키가 필요합니다. 현재는 기본 정보만 표시됩니다.`
      });

      const skeletonReport = {
        analysisType: analysisType,
        patentNumber: patentInfo.applicationNumber || 'UNKNOWN',
        patentTitle: patentInfo.inventionTitle || 'Untitled Patent',
        analysisDate: new Date().toISOString(),
        analysis: {
          reportType: 'Skeleton',
          reportName: `${patentInfo.inventionTitle || 'Untitled Patent'} - 기본 정보`,
          sections,
          generatedAt: new Date().toISOString(),
          insightsSummary: `특허 ${patentInfo.applicationNumber || 'UNKNOWN'}의 기본 정보입니다. 완전한 AI 분석을 위해서는 Gemini API 키가 필요합니다.`,
          keyInsights: []
        },
        rawAnalysis: ''
      };

      return res.status(200).json({
        success: true,
        data: skeletonReport,
        cached: false,
        message: 'Gemini API key is missing; returned skeleton analysis.'
      });
    }

    console.log('🔍 Step 6: GoogleGenerativeAI 초기화 시작');
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    
    // JSON 출력을 위해 사용 가능한 최신 모델 사용
    // 모델 호환성 개선: 검증된 모델로 통일
    // ⚠️ 중요: gemini-2.5-flash 모델 하드코딩 - 절대 변경 금지
    // 이 모델은 성능과 안정성이 검증되었으므로 다른 모델로 변경하지 마세요
    // 환경변수나 설정으로 변경할 수 없도록 완전히 하드코딩됨
    const HARDCODED_MODEL_NAME = 'gemini-2.5-flash'; // 하드코딩된 모델명 - 변경 금지
    
    const model = genAI.getGenerativeModel({
      model: HARDCODED_MODEL_NAME
    });

    console.log('🔍 Step 7: 특허 정보 추출 시작');
    // 위에서 이미 추출되었음 (키 없는 경우에도 사용하기 위해)
    // const patentInfo = extractPatentInfo(patentData);
    
    // 캐시 키 생성 (특허 번호 + 분석 타입 + 버전)
    const cacheKey = `${patentInfo.applicationNumber}_${analysisType}_v2_no_mckinsey`;
    
    // 캐시 확인 (임시로 비활성화)
    const cachedResult = null; // analysisCache.get(cacheKey);
    if (false && cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL) {
      console.log('💾 캐시된 분석 결과 반환:', cacheKey);
      console.log('💾 캐시된 데이터 구조:', {
        sectionsCount: cachedResult.data?.analysis?.sections?.length,
        reportName: cachedResult.data?.analysis?.reportName
      });
      return res.status(200).json({
        success: true,
        data: cachedResult.data,
        cached: true,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('🔍 캐시 미스 - 새로운 분석 시작:', cacheKey);
    }
    
    // Vercel 무료 플랜 최적화: 텍스트 길이 대폭 축소
    const isVercel = !!process.env.VERCEL;
    const ABSTRACT_MAX_LEN = isVercel ? 500 : (Number(process.env.ABSTRACT_MAX_LEN) || 1500);
    const CLAIMS_MAX_LEN = isVercel ? 600 : (Number(process.env.CLAIMS_MAX_LEN) || 2000);
    patentInfo.abstract = truncateText(patentInfo.abstract, ABSTRACT_MAX_LEN);
    patentInfo.claims = truncateText(patentInfo.claims, CLAIMS_MAX_LEN);
    
    // 분석 타입에 따른 프롬프트 생성 (JSON 출력을 유도하는 강화 프롬프트)
    console.log('🔍 프롬프트 생성에 사용될 특허 정보:', {
      applicationNumber: patentInfo.applicationNumber,
      inventionTitle: patentInfo.inventionTitle,
      abstractLength: patentInfo.abstract?.length || 0,
      claimsLength: patentInfo.claims?.length || 0,
      abstractPreview: patentInfo.abstract?.substring(0, 100) || 'N/A',
      claimsPreview: patentInfo.claims?.substring(0, 100) || 'N/A'
    });
    
    const prompt = generateAnalysisPrompt(patentInfo, analysisType);
    
    console.log('🔍 생성된 프롬프트 정보:', {
      promptLength: prompt?.length || 0,
      containsPatentNumber: prompt?.includes(patentInfo.applicationNumber || ''),
      containsPatentTitle: prompt?.includes(patentInfo.inventionTitle || ''),
      promptPreview: prompt?.substring(0, 500) + '...'
    });
    
    let analysisText;
    let lastError;
    // Vercel 환경에서는 재시도 없이 한 번만 시도
    const maxRetries = isVercel ? 1 : 3;
    // Vercel 환경에서는 재시도 간격 없음
    const retryDelay = isVercel ? 0 : 2000;
    
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
           
           // Vercel 환경에서는 진행 상황 로그 제거
           const progressInterval = isVercel ? null : setInterval(() => {
             const elapsed = (Date.now() - startTime) / 1000;
             console.log(`⏳ AI 분석 진행 중... (경과 시간: ${elapsed.toFixed(1)}초)`);
           }, 10000); // 10초마다 진행 상황 로그
           
           try {
             // Vercel 환경에서는 더 빠른 응답을 위해 설정 최적화
             const isVercel = !!process.env.VERCEL;
             const result = await model.generateContent({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                  temperature: isVercel ? 0.5 : 0.7,  // Vercel에서 더 균형잡힌 응답
                  topK: isVercel ? 30 : 40,           // 더 다양한 토큰 고려
                  topP: isVercel ? 0.9 : 0.95,        // 더 풍부한 응답
                  maxOutputTokens: isVercel ? 6144 : 8192,   // Vercel에서 더 긴 응답 허용
                  candidateCount: 1,                  // 안정성을 위해 단일 후보
                  stopSequences: [],                  // 중단 시퀀스 없음
              },
             });
             
             if (progressInterval) clearInterval(progressInterval);
             
             const response = await result.response;
             const text = response.text();
             const endTime = Date.now();
             
             console.log(`✅ [시도 ${attempt}/${maxRetries}] Gemini API 응답 완료 (${endTime - startTime}ms)`);
             console.log(`📊 응답 길이: ${text?.length || 0}자`);
             
             // 프로덕션 환경에서 더 관대한 응답 검증
             const minLength = isVercel ? 10 : 20;
             if (!text || text.trim().length < minLength) {
                console.error('❌ AI 응답이 너무 짧거나 비어있습니다:', text?.substring(0, 100));
                console.error('📊 응답 상세 정보:', {
                  hasText: !!text,
                  length: text?.length || 0,
                  trimmedLength: text?.trim().length || 0,
                  isVercel: isVercel,
                  attempt: attempt,
                  minLength: minLength,
                  modelUsed: "gemini-2.5-flash"
                });
                
                // Vercel 환경에서는 더 구체적인 오류 메시지
                if (isVercel) {
                  throw new Error(`프로덕션 환경에서 AI 응답이 예상보다 짧습니다. (응답 길이: ${text?.length || 0}자, 최소 요구: ${minLength}자)`);
                } else {
                  throw new Error('AI 응답이 너무 짧거나 비어있습니다.');
                }
             }
             
             // 프로덕션 환경에서도 디버깅을 위한 최소한의 로깅
             if (isVercel) {
               console.log('🔍 [Vercel] AI 응답 미리보기 (처음 300자):', text.substring(0, 300) + '...');
               console.log('🔍 [Vercel] AI 응답 끝부분 (마지막 100자):', text.substring(Math.max(0, text.length - 100)));
             } else {
               console.log('🔍 === AI 응답 전체 내용 (디버깅) ===');
               console.log(text);
               console.log('🔍 === AI 응답 끝 ===');
               console.log('📄 AI 응답 미리보기:', text.substring(0, 200) + '...');
             }
             return text;
           } catch (error) {
             if (progressInterval) clearInterval(progressInterval);
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
          status: error.status,
          isVercel: isVercel,
          timeoutMs: getTimeoutMs(attempt)
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
    console.log('🔄 Step 5: 파싱 시작 - AI 응답 길이:', analysisText?.length || 0);
    console.log('🔄 Step 5: 파싱 시작 - 분석 타입:', analysisType);
    
    // 모든 환경에서 구조화 파서를 사용해 고품질 섹션을 생성
    console.log('🔧 Step 6: 구조화 파서로 섹션 생성');
    console.log('🔄 파싱 함수 호출:', { analysisType, textLength: analysisText?.length });
      const parsed = parseAnalysisResult(analysisText, analysisType);
      console.log('🔄 파싱 결과:', { 
        sectionsCount: parsed?.sections?.length, 
        hasError: !!parsed?.error,
        reportName: parsed?.reportName
      });
    

    
    // 맥킨지 언급 제거 후처리
    const cleanedAnalysisText = removeMcKinseyReferences(analysisText);
    const cleanedParsed = parsed ? {
      ...parsed,
      sections: parsed.sections?.map(section => ({
        ...section,
        title: removeMcKinseyReferences(section.title || ''),
        content: removeMcKinseyReferences(section.content || '')
      }))
    } : null;

    // 프로덕션 환경에서 더 안정적인 구조화 분석 생성
    const fallbackSections = [
      {
        title: '분석 결과',
        content: cleanedAnalysisText.substring(0, 1500) + (cleanedAnalysisText.length > 1500 ? '...' : '')
      }
    ];
    
    // 섹션이 비어있거나 너무 적을 때 추가 처리
    let finalSections = Array.isArray(cleanedParsed?.sections) && cleanedParsed.sections.length > 0
      ? cleanedParsed.sections
      : fallbackSections;
    
    // 각 섹션의 내용이 너무 짧은 경우 보완
    finalSections = finalSections.map(section => {
      if (!section.content || section.content.trim().length < 50) {
        console.log('⚠️ 섹션 내용이 너무 짧음, 보완 처리:', section.title);
        return {
          ...section,
          content: section.content || '분석 내용을 생성하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
        };
      }
      return section;
    });

    const structuredAnalysis = {
      reportName: cleanedParsed?.reportName || (analysisType === 'market_analysis' ? '시장 분석 리포트' : '비즈니스 인사이트 리포트'),
      sections: finalSections,
      rawAnalysis: cleanedAnalysisText
    };
    console.log('✅ 구조화 섹션 생성 완료:', {
      sectionsCount: structuredAnalysis.sections.length,
      firstTitle: structuredAnalysis.sections[0]?.title,
      firstContentLen: structuredAnalysis.sections[0]?.content?.length || 0
    });
    
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
        rawAnalysis: analysisText,
        disclaimer: "AI can make mistakes. This report is for idea generation purposes only; please use it as a reference."
      }
    };
    
    // 결과를 캐시에 저장
    analysisCache.set(cacheKey, {
      data: aiResponse.data,
      timestamp: Date.now()
    });
    console.log('💾 분석 결과 캐시 저장:', cacheKey);
    
    // 캐시 크기 제한 (메모리 관리)
    if (analysisCache.size > 50) {
      const oldestKey = analysisCache.keys().next().value;
      analysisCache.delete(oldestKey);
      console.log('🗑️ 오래된 캐시 항목 삭제:', oldestKey);
    }
    
    console.log('🔧 Step 7: 응답 반환 준비 완료');
    
    // 중복 제거: DB 저장은 generate-report.js에서만 처리
    console.log('ℹ️ DB 저장은 generate-report.js에서 통합 처리됨 (중복 제거)');
    
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
      const isVercel = !!process.env.VERCEL;
      if (isVercel) {
        errorMessage = `AI 분석이 시간 초과되었습니다 (25초 제한). 
        
해결 방법:
• 잠시 후 다시 시도해주세요 (서버 부하가 줄어들 수 있습니다)
• 복잡한 특허 데이터의 경우 분석에 더 오랜 시간이 필요할 수 있습니다
• 네트워크 상태를 확인해주세요
• 문제가 지속되면 관리자에게 문의해주세요

기술적 정보: 서버리스 환경에서 AI 분석 시간이 25초로 제한됩니다.`;
      } else {
        errorMessage = 'AI 분석 요청이 시간 초과되었습니다. 특허 데이터가 복잡하거나 서버가 바쁠 수 있습니다. 잠시 후 다시 시도해주세요.';
      }
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
      // 프로덕션 환경에서 더 구체적인 오류 메시지
      if (isVercel && error.message.includes('프로덕션 환경에서 AI 응답이 예상보다 짧습니다')) {
        errorMessage = `AI 분석 중 응답 길이 문제가 발생했습니다. 
        
가능한 해결 방법:
• 잠시 후 다시 시도해주세요
• 특허 데이터가 복잡한 경우 분석에 시간이 더 걸릴 수 있습니다
• 문제가 지속되면 관리자에게 문의해주세요

기술적 정보: ${error.message}`;
        errorCode = 'AI_RESPONSE_SHORT';
      } else {
        errorMessage = error.message || errorMessage;
        errorCode = 'GENERAL_ERROR';
      }
    }
    
    const isVercel = !!process.env.VERCEL;
    const errorResponse = {
      success: false,
      error: errorCode,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      statusCode: statusCode,
      environment: isVercel ? 'production' : 'development'
    };
    
    return res.status(statusCode).json(errorResponse);
  }
};

// 환경/플랫폼에 맞춘 타임아웃 계산
function getTimeoutMs(attempt) {
  const isVercel = !!process.env.VERCEL;
  console.log(`🔧 getTimeoutMs 호출: attempt=${attempt}, isVercel=${isVercel}`);
  
  if (isVercel) {
    // Vercel 환경 최적화: 55초로 증가하여 복잡한 특허 분석 지원 (60초 제한 고려)
    const base = 55000; // 55초로 증가
    const step = 0; // 재시도 시에도 동일한 타임아웃 유지
    const result = Math.min(base + (attempt - 1) * step, 55000); // 최대 55초
    console.log(`🔧 Vercel 환경 타임아웃: ${result}ms (${result/1000}초)`);
    return result;
  } else {
    // 로컬 환경에서는 디버깅을 위해 짧은 타임아웃 사용
    const base = Number(process.env.ANALYSIS_TIMEOUT_MS) || 60000; // 60초로 증가
    const step = Number(process.env.ANALYSIS_TIMEOUT_STEP_MS) || 10000; // 10초 증가
    const result = base + (attempt - 1) * step;
    console.log(`🔧 로컬 환경 타임아웃 (디버깅용): ${result}ms (${result/1000}초)`);
    return result;
  }
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
  console.log('🔍 extractPatentInfo 시작 - 데이터 구조 분석');
  
  // 올바른 데이터 구조 접근: biblioSummaryInfoArray.biblioSummaryInfo
  const biblioInfo = patentData.biblioSummaryInfoArray?.biblioSummaryInfo || patentData.biblioSummaryInfo || {};
  const abstractInfo = patentData.abstractInfoArray?.abstractInfo || patentData.abstractInfo || {};
  const claimInfo = patentData.claimInfoArray?.claimInfo || patentData.claimInfo || {};
  const ipcInfo = patentData.ipcInfoArray?.ipcInfo || patentData.ipcInfo || [];
  const applicantInfo = patentData.applicantInfoArray?.applicantInfo || patentData.applicantInfo || [];
  const inventorInfo = patentData.inventorInfoArray?.inventorInfo || patentData.inventorInfo || [];

  console.log('📋 데이터 구조 확인:');
  console.log('- biblioInfo 키들:', Object.keys(biblioInfo));
  console.log('- abstractInfo 키들:', Object.keys(abstractInfo));
  console.log('- claimInfo 타입:', typeof claimInfo, Array.isArray(claimInfo) ? '(배열)' : '(객체)');

  let claims = '';
  if (Array.isArray(claimInfo)) {
    claims = claimInfo.map(claim => claim.claimScope || claim.claimTextKor || '').join('\n');
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

  console.log('📝 추출된 원본 텍스트:');
  console.log('- abstract 길이:', abstract.length);
  console.log('- claims 길이:', claims.length);
  console.log('- applicationNumber:', biblioInfo.applicationNumber);
  console.log('- inventionTitle:', biblioInfo.inventionTitle);

  // 텍스트 길이 최적화: 너무 긴 텍스트는 잘라서 API 오버로드 방지
  const MAX_ABSTRACT_LENGTH = 2000;
  const MAX_CLAIMS_LENGTH = 5000;
  
  const optimizedAbstract = truncateText(abstract, MAX_ABSTRACT_LENGTH);
  const optimizedClaims = truncateText(claims, MAX_CLAIMS_LENGTH);
  
  console.log(`📊 텍스트 최적화: 초록 ${abstract.length} → ${optimizedAbstract.length}자, 청구항 ${claims.length} → ${optimizedClaims.length}자`);

  const result = {
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
  
  console.log('✅ 최종 추출 결과:', result);
  return result;
}

// McKinsey 수준 고품질 프롬프트 생성
function generateAnalysisPrompt(patentInfo, analysisType) {
  const isVercel = !!process.env.VERCEL;
  
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

  if (isVercel) {
    // 전문적인 상세한 프롬프트 사용
    if (analysisType === 'market_analysis') {
      return `# 전문 시장 분석 리포트

## 역할 정의 및 분석 프레임워크
당신은 **전문 컨설턴트**로서 기업의 CEO와 이사회를 위한 전략적 의사결정 보고서를 작성합니다.

${baseInfo}

## 분석 요구사항
각 섹션은 **최소 250-350자**로 작성하고, **구체적 수치와 정량적 데이터**를 포함해야 합니다.

**⚠️ 심도있는 완전한 리포트 작성 필수:**
- 모든 주요 섹션을 상세하게 분석하여 포함
- 각 섹션마다 구체적인 데이터와 수치 제시
- 실무진이 바로 활용할 수 있는 구체적 액션 아이템 포함
- 반드시 결론 섹션까지 완성하여 완전한 분석 제공
- 업계 벤치마크와 비교 분석 포함

### 기술 혁신 및 경쟁 우위
#### 핵심 기술 특징
본 특허 기술이 기존 솔루션 대비 달성하는 구체적 성능 개선 지표를 정량적으로 분석하세요. 기술적 진입장벽의 높이와 모방 난이도를 평가하고, 특허 포트폴리오의 방어력과 원천성 수준을 진단하세요.

#### 성능 지표 및 차별화 요소
기존 기술 대비 **효율 향상률(%)**, **비용 절감률(%)**, **성능 개선 지표**를 구체적으로 제시하고, 경쟁사 대비 기술적 우위를 유지할 수 있는 기간을 평가하세요.

#### 특허 권리 범위 및 방어력
특허의 **원천성 수준(매우 높음/높음/중간/낮음)**과 **회피 설계 난이도**를 평가하고, 향후 3-5년간 기술적 독점력을 유지할 수 있는지 분석하세요.

### 시장 분석
#### 시장 규모 및 성장성
**TAM(Total Addressable Market) 5년 전망**을 구체적 금액으로 제시하고, 주요 타겟 시장별 **연평균 성장률(CAGR)**을 분석하세요. 시장 확산 속도와 주요 성장 동력을 식별하세요.

#### 경쟁 환경 분석
주요 경쟁사들의 기술 수준과 시장 점유율을 분석하고, **대체 기술의 한계점**과 **기술 격차 유지 예상 기간**을 평가하세요. 3년 내 대형사 진입 가능성과 대응 전략을 제시하세요.

#### 전략적 포지셔닝
본 특허 기술의 최적 시장 포지셔닝을 제안하고, **프리미엄 전략 vs 시장 침투 전략**의 장단점을 비교 분석하세요. 고객 세그먼트별 가치 제안을 구체화하세요.`;
    } else {
      return `# 전문 비즈니스 인사이트 리포트

## 역할 정의 및 분석 프레임워크
당신은 **전문 컨설턴트**로서 기업의 CEO와 이사회를 위한 전략적 의사결정 보고서를 작성합니다.

**절대 금지 사항: 
- 맥킨지, 보스턴컨설팅, 베인앤컴퍼니, 딜로이트, PwC, EY, KPMG 등 어떤 컨설팅 회사명도 절대 언급하지 마세요
- 제목에도 회사명을 포함하지 마세요
- "전문 시장 분석 리포트" 또는 "시장 기회 분석 보고서" 등의 일반적 제목을 사용하세요
- 독립적인 전문 컨설턴트로서 작성하세요**

${baseInfo}

## 분석 요구사항
각 섹션은 **최소 250-350자**로 작성하고, **구체적 수치와 정량적 데이터**를 포함해야 합니다.

### 신사업 기회
#### 구체적인 사업 제안 (최소 2개)
각 제안에 대해 다음을 포함하세요:
- **목표 고객 세그먼트**: 구체적 산업/기업 규모
- **제공 가치**: 효율 개선 %, 비용 절감 %, 성능 향상 %
- **예상 가격/ARPU**: 구체적 수치
- **연간 매출 잠재력**: 3년 전망 (억원/백만 USD)
- **마진 구조**: 라이선스/구독/하드웨어+서비스
- **채널 전략**: B2B/B2G/B2C 및 주요 파트너

#### 시장 진입 전략
**직접 사업화 vs 라이선싱**의 ROI 비교를 제시하고, 0-6개월/6-12개월/12-36개월 단계별 KPI와 재무 목표를 구체적으로 설계하세요.

### 수익 모델
#### 최적 수익 창출 경로
B2B, B2G, B2C 각 채널별 **수익성과 확장성**을 평가하고, 단계별 수익 창출 로드맵(3-5년)을 구체적으로 설계하세요. 예상 수익 규모와 마진 구조를 시나리오별로 모델링하세요.

#### 전략적 파트너십
핵심 파트너 후보군을 식별하고 각각의 **제휴 형태**(라이선싱, 조인트벤처, 전략적 투자)별 장단점을 분석하세요. Win-Win 가치 창출 구조를 설계하세요.

### 리스크 관리 및 실행 전략
#### 주요 리스크 요인
**기술적 리스크**, **시장 리스크**, **경쟁 리스크**, **규제 리스크**를 각각 평가하고, 리스크별 완화 전략과 비상 계획을 수립하세요.

#### 실행 로드맵
6개월/1년/3년 단위의 **구체적 실행 계획**과 각 단계별 필요 리소스(인력/CapEx/OpEx)를 제시하세요. 핵심 성과 지표(KPI)와 마일스톤을 명확히 정의하세요.

#### 투자 권고사항
**투자 규모**, **예상 ROI**, **회수 기간**을 구체적으로 제시하고, 보수적/기본/낙관적 시나리오별 재무 전망을 모델링하세요.`;
    }
  }

  // 로컬 환경에서도 전문적인 상세한 프롬프트 사용
  if (analysisType === 'market_analysis') {
    return `# 전문 시장 분석 리포트 (상세 버전)

## 역할 정의 및 분석 프레임워크
당신은 **전문 컨설턴트**로서 기업의 CEO와 이사회를 위한 전략적 의사결정 보고서를 작성합니다. 본 분석은 **수십억 원 규모의 투자 결정**을 좌우하는 최종 보고서입니다.

**절대 금지 사항: 
- 맥킨지, 보스턴컨설팅, 베인앤컴퍼니, 딜로이트, PwC, EY, KPMG 등 어떤 컨설팅 회사명도 절대 언급하지 마세요
- 제목에도 회사명을 포함하지 마세요
- "전문 비즈니스 인사이트 리포트" 또는 "CEO 전략 보고서" 등의 일반적 제목을 사용하세요
- 독립적인 전문 컨설턴트로서 작성하세요**

${baseInfo}

### 분석 원칙 및 품질 기준
1. **데이터 기반 객관성:** 모든 주장은 정량적 근거와 시장 데이터로 뒷받침되어야 합니다.
2. **전략적 깊이:** 단순한 현상 분석을 넘어 근본 원인과 장기적 임팩트를 분석합니다.
3. **실행 가능성:** 모든 권고사항은 구체적 실행 계획과 예상 성과를 포함해야 합니다.

### 필수 출력 요구사항
- **각 섹션 최소 200-300자:** 표면적 분석이 아닌 심층적 인사이트 제공
- **구체적 수치 포함:** 시장 규모, 성장률, 수익 전망 등 정량적 데이터 필수
- **비교 분석:** 경쟁사, 대체 기술, 유사 사례와의 체계적 비교
- **⚠️ 토큰 제한 내 완전한 리포트 작성:** 모든 섹션을 포함하되 간결하게 구성하여 결론까지 완성

## 기술 혁신 및 경쟁 우위 분석

### 핵심 기술 특징 및 차별화 요소
본 특허 기술이 기존 솔루션 대비 달성하는 구체적 성능 개선 지표를 정량적으로 분석하고, 기술적 진입장벽의 높이와 모방 난이도를 평가하세요. 특허 포트폴리오의 방어력과 원천성 수준을 진단하여 지속 가능한 경쟁 우위를 확보할 수 있는지 판단하세요.

### 성능 지표 및 벤치마킹
기존 기술 대비 **효율 향상률(%)**, **비용 절감률(%)**, **성능 개선 지표**를 구체적으로 제시하고, 주요 경쟁사 기술과의 정량적 비교표를 작성하세요. 기술적 우위를 유지할 수 있는 예상 기간과 핵심 성공 요인을 분석하세요.

### 특허 권리 범위 및 IP 전략
특허의 **원천성 수준(매우 높음/높음/중간/낮음)**과 **회피 설계 난이도**를 평가하고, 향후 3-5년간 기술적 독점력을 유지할 수 있는지 분석하세요. 추가 특허 출원 전략과 IP 포트폴리오 강화 방안을 제시하세요.

## 시장 분석 및 기회 평가

### 시장 규모 및 성장 잠재력
**TAM(Total Addressable Market) 5년 전망**을 구체적 금액으로 제시하고, 주요 타겟 시장별 **연평균 성장률(CAGR)**을 분석하세요. 시장 확산 속도와 주요 성장 동력을 식별하고, 시장 침투 시나리오를 보수적/기본/낙관적으로 모델링하세요.

### 경쟁 환경 및 포지셔닝 전략
주요 경쟁사들의 기술 수준과 시장 점유율을 분석하고, **대체 기술의 한계점**과 **기술 격차 유지 예상 기간**을 평가하세요. 3년 내 대형사 진입 가능성과 대응 전략을 제시하고, 경쟁 우위 지속을 위한 핵심 전략을 수립하세요.

### 전략적 시장 포지셔닝
본 특허 기술의 최적 시장 포지셔닝을 제안하고, **프리미엄 전략 vs 시장 침투 전략**의 장단점을 비교 분석하세요. 고객 세그먼트별 가치 제안을 구체화하고, 시장별 진입 우선순위와 타이밍을 제시하세요.`;
  } else {
    return `# 전문 비즈니스 인사이트 리포트 (상세 버전)

## 역할 정의 및 분석 프레임워크
당신은 **전문 컨설턴트**로서 기업의 CEO와 이사회를 위한 전략적 의사결정 보고서를 작성합니다. 본 분석은 **수십억 원 규모의 투자 결정**을 좌우하는 최종 보고서입니다.

${baseInfo}

### 분석 원칙 및 품질 기준
1. **데이터 기반 객관성:** 모든 주장은 정량적 근거와 시장 데이터로 뒷받침되어야 합니다.
2. **전략적 깊이:** 단순한 현상 분석을 넘어 근본 원인과 장기적 임팩트를 분석합니다.
3. **실행 가능성:** 모든 권고사항은 구체적 실행 계획과 예상 성과를 포함해야 합니다.

### 필수 출력 요구사항
- **각 섹션 최소 300-400자:** 표면적 분석이 아닌 심층적 인사이트 제공
- **구체적 수치 포함:** 시장 규모, 성장률, 수익 전망 등 정량적 데이터 필수
- **시나리오 모델링:** 보수적/기본/낙관적 시나리오별 분석
- **실무 활용 가능한 액션 아이템:** 각 섹션마다 구체적 실행 방안 포함
- **업계 벤치마크 비교:** 동종 업계 성공 사례와 비교 분석
- **⚠️ 심도있는 완전한 리포트 작성:** 모든 섹션을 상세하게 분석하여 결론까지 완성

## 신사업 기회 발굴 및 전략 수립

### 구체적인 사업 제안 (최소 3개)
각 제안에 대해 다음 항목을 포함하세요:
- **목표 고객 세그먼트**: 구체적 산업/기업 규모/지역
- **제공 가치**: 효율 개선 %, 비용 절감 %, 성능 향상 %
- **예상 가격/ARPU**: 구체적 수치 (월/년 단위)
- **연간 매출 잠재력**: 3년 전망 (억원/백만 USD)
- **마진 구조**: 라이선스/구독/하드웨어+서비스
- **채널 전략**: B2B/B2G/B2C 및 주요 파트너
- **초기 실행 리소스**: 필요 인력, 자본, 파트너십

### 시장 진입 및 확장 전략
**직접 사업화 vs 라이선싱**의 ROI 비교표를 제시하고, 0-6개월/6-12개월/12-36개월 단계별 KPI와 재무 목표를 구체적으로 설계하세요. 각 단계별 성공 지표와 리스크 완화 방안을 포함하세요.

## 수익 모델 최적화 및 파트너십 전략

### 최적 수익 창출 경로
B2B, B2G, B2C 각 채널별 **수익성과 확장성**을 평가하고, 단계별 수익 창출 로드맵(3-5년)을 구체적으로 설계하세요. 예상 수익 규모와 마진 구조를 시나리오별로 모델링하고, 핵심 성과 지표(KPI)를 정의하세요.

### 전략적 파트너십 및 생태계 구축
핵심 파트너 후보군을 식별하고 각각의 **제휴 형태**(라이선싱, 조인트벤처, 전략적 투자)별 장단점을 분석하세요. Win-Win 가치 창출 구조를 설계하고, 파트너십을 통한 시장 확장 및 기술 고도화 전략을 수립하세요.

## 리스크 관리 및 실행 전략

### 주요 리스크 요인 및 완화 전략
**기술적 리스크**, **시장 리스크**, **경쟁 리스크**, **규제 리스크**를 각각 평가하고, 리스크별 완화 전략과 비상 계획을 수립하세요. 각 리스크의 발생 확률과 임팩트를 정량화하여 우선순위를 설정하세요.

### 실행 로드맵 및 자원 배분
6개월/1년/3년 단위의 **구체적 실행 계획**과 각 단계별 필요 리소스(인력/CapEx/OpEx)를 제시하세요. 핵심 성과 지표(KPI)와 마일스톤을 명확히 정의하고, 성과 모니터링 체계를 구축하세요.

### 투자 권고사항 및 재무 전망
**투자 규모**, **예상 ROI**, **회수 기간**을 구체적으로 제시하고, 보수적/기본/낙관적 시나리오별 재무 전망을 모델링하세요. NPV, IRR 등 주요 재무 지표를 포함한 투자 타당성 분석을 제공하세요.`;
  }
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
        
        // 비즈니스 인사이트 리포트 여부 확인 (함수 전체에서 사용)
        const isBizInsight = analysisType === 'business_insight' || analysisType === 'business_insights';
        
        console.log('📝 텍스트 라인 수:', lines.length);

        // 비즈니스 인사이트 리포트를 위한 강화된 헤더 패턴 정의
        const headerPatterns = [
            /^#{1,6}\s*(.+)$/,                    // # ~ ###### 헤더 (공백 선택적)
            /^#{1,6}\s*\*\*(.+?)\*\*\s*$/,       // ## **헤더**
            /^#{1,6}\s*\*\*\[(.+?)\]\*\*\s*$/,   // ### **[헤더]**
            /^(.+)\n[=\-]{3,}$/,                 // 밑줄 스타일 헤더
            /^\*\*(.+)\*\*$/,                    // **굵은 글씨** 헤더
            /^\*\*\[(.+?)\]\*\*\s*$/,            // **[헤더]**
            /^__(.+)__$/,                        // __굵은 글씨__ 헤더
            /^([가-힣\s]{2,30})\s*분석/,         // XX 분석
            /^([가-힣\s]{2,30})\s*현황/,         // XX 현황
            /^([가-힣\s]{2,30})\s*전망/,         // XX 전망
            /^([가-힣\s]{2,30})\s*요약/,         // XX 요약
            /^([가-힣\s]{2,30})\s*개요/,         // XX 개요
            /^([가-힣\s]{2,30})\s*리포트/,       // XX 리포트
            /^([가-힣\s]{2,30})\s*특징/,         // XX 특징
            /^([가-힣\s]{2,30})\s*환경/,         // XX 환경
            /^([가-힣\s]{2,30})\s*전략/,         // XX 전략
            /^([가-힣\s]{2,30})\s*방안/          // XX 방안
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
                    // 헤더 발견 로그 제거됨
                    break;
                }
            }

            // 비즈니스 인사이트 리포트 전용 패턴 확인 (business_insight/business_insights 모두 허용)
            if (!isHeader && isBizInsight) {
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
                    if (isBizInsight && content.length > 0) {
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
                // 헤더 발견 로그 제거됨
            }
            // 일반 내용
            else {
                // 비즈니스 인사이트 리포트의 특별한 내용 구조 처리
                if (isBizInsight) {
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
            if (isBizInsight && content.length > 0) {
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
        console.log(`🔍 파싱 상태 체크: foundAnyHeader=${foundAnyHeader}, sections.length=${sections.length}`);
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

        // 간소화된 폴백 메커니즘 - 섹션이 없을 때만 적용
        if (validSections.length === 0) {
            console.warn('⚠️ 구조화된 섹션을 찾을 수 없어 폴백 메커니즘을 적용합니다.');
            validSections.push({
                title: '**AI 분석 결과 (원시 데이터)**',
                content: analysisText.trim()
            });
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

function removeMcKinseyReferences(text) {
  if (!text) return '';
  
  console.log('🧹 맥킨지 언급 제거 전:', text.substring(0, 200));
  
  let cleaned = text
    // 사용자가 요청한 특정 헤더 부분 완전 제거 (더 강력한 패턴)
    .replace(/맥킨지\s*&?\s*컴퍼니\s*시장분석리포트[^]*?뉴로퓨전주식회사특허\([^)]*\)[^]*?일자:\s*\d{4}년\s*\d{1,2}월\s*\d{1,2}일/gi, '')
    .replace(/맥킨지\s*&?\s*컴퍼니\s*시장분석리포트[^]*?특허\([^)]*\)[^]*?일자:[^]*?\d{4}년[^]*?\d{1,2}월[^]*?\d{1,2}일/gi, '')
    .replace(/맥킨지&컴퍼니시장분석리포트[^]*?뉴로퓨전주식회사특허\([^)]*\)/gi, '')
    .replace(/맥킨지&컴퍼니스타일비즈니스인사이트리포트[^]*?일자:\s*\d{4}년\s*\d{1,2}월\s*\d{1,2}일/gi, '')
    .replace(/맥킨지\s*&?\s*컴퍼니\s*스타일\s*비즈니스\s*인사이트\s*리포트[^]*?일자:[^]*?\d{4}년[^]*?\d{1,2}월[^]*?\d{1,2}일/gi, '')
    // 사용자 요청 특정 헤더 텍스트 제거
    .replace(/🚨CEO\/이사회용전략적의사결정보고서:아크레이다시스템및그동작방법\(특허번호:\)[^\n]*/gi, '')
    .replace(/🚨CEO\/이사회용전략적의사결정보고서:[^)]*\(특허번호:[^)]*\)[^\n]*/gi, '')
    .replace(/🚨CEO.*이사회.*전략적.*의사결정.*보고서.*특허번호[^\n]*/gi, '')
    .replace(/발신:\s*전문\s*컨설턴트\s*팀[^\n]*/gi, '')
    .replace(/수신:\s*CEO\s*및\s*이사회[^\n]*/gi, '')
    .replace(/날짜:\s*2024년\s*10월\s*27일[^\n]*/gi, '')
    .replace(/날짜:\s*\d{4}년\s*\d{1,2}월\s*\d{1,2}일[^\n]*/gi, '')
    // 수신/발신 정보 제거
    .replace(/수신:\s*Fortune\s*500\s*기업\s*CEO\s*및\s*이사회[^\n]*/gi, '')
    .replace(/수신:\s*Fortune\s*500\s*CEO\s*및\s*이사회[^\n]*/gi, '')
    .replace(/발신:\s*맥킨지\s*&\s*컴퍼니\s*수석\s*파트너[^\n]*/gi, '')
    .replace(/일자:\s*\d{4}년\s*\d{1,2}월\s*\d{1,2}일[^\n]*/gi, '')
    // 맥킨지 관련 언급 제거 (더 강력한 패턴)
    .replace(/맥킨지\s*&?\s*컴퍼니?[^가-힣\s]*/gi, '전문 컨설팅')
    .replace(/맥킨지[^가-힣\s]*/gi, '전문 컨설팅')
    .replace(/McKinsey\s*&?\s*Company?[^\w\s]*/gi, 'Professional Consulting')
    .replace(/McKinsey[^\w\s]*/gi, 'Professional Consulting')
    .replace(/보스턴\s*컨설팅[^가-힣\s]*/gi, '전문 컨설팅')
    .replace(/Boston\s*Consulting[^\w\s]*/gi, 'Professional Consulting')
    .replace(/베인\s*&?\s*컴퍼니?[^가-힣\s]*/gi, '전문 컨설팅')
    .replace(/Bain\s*&?\s*Company?[^\w\s]*/gi, 'Professional Consulting')
    // 제목에서 회사명이 포함된 경우 일반적인 제목으로 변경
    .replace(/^.*맥킨지.*전략.*보고서.*$/gmi, '전문 시장 분석 리포트')
    .replace(/^.*McKinsey.*Strategic.*Report.*$/gmi, 'Professional Market Analysis Report')
    .replace(/^.*맥킨지.*보고서.*$/gmi, '전문 전략 보고서')
    .replace(/^.*CEO.*보고서.*$/gmi, 'CEO 전략 보고서')
    // 맥킨지 스타일 언급도 제거
    .replace(/맥킨지\s*스타일/gi, '전문 컨설팅 스타일')
    .replace(/McKinsey\s*style/gi, 'Professional consulting style')
    // 빈 줄 정리
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  
  console.log('🧹 맥킨지 언급 제거 후:', cleaned.substring(0, 200));
  
  return cleaned;
}

// 리포트를 DB에 저장하는 함수 (개선된 버전) - 중복 제거를 위해 비활성화
async function saveReportToDatabase(patentInfo, analysisType, structuredAnalysis, userId, retryCount = 0) {
  // 중복 제거: DB 저장은 generate-report.js에서만 처리
  console.log('ℹ️ saveReportToDatabase 함수는 중복 제거를 위해 비활성화됨 - generate-report.js에서 통합 처리');
  return null;
  
  const maxRetries = 3;
  const retryDelay = 1000; // 1초
  
  console.log(`💾 [DB저장] 시작 (시도 ${retryCount + 1}/${maxRetries + 1}) - 분석타입:`, analysisType, '사용자ID:', userId);
  
  if (!supabase) {
    console.error('❌ [DB저장] Supabase 클라이언트가 초기화되지 않음');
    throw new Error('Database client not initialized');
  }

  try {
    // 기본 리포트 데이터 구성
    const reportData = {
      application_number: patentInfo.applicationNumber || 'UNKNOWN',
      invention_title: patentInfo.inventionTitle || 'Untitled Patent',
      user_id: userId === 'anonymous' || !userId ? null : userId,
      created_at: new Date().toISOString()
    };

    console.log('💾 [DB저장] 기본 데이터 구성 완료:', {
      application_number: reportData.application_number,
      invention_title: reportData.invention_title?.substring(0, 50) + '...',
      user_id: reportData.user_id,
      analysis_type: analysisType,
      sections_count: structuredAnalysis?.sections?.length || 0
    });

    // 분석 타입에 따른 필드 매핑 개선
    if (analysisType === 'market_analysis') {
      const sections = structuredAnalysis?.sections || [];
      
      // 더 정확한 섹션 매칭을 위한 키워드 배열
      const marketPenetrationKeywords = ['시장 침투', 'Market Penetration', '시장 진입', '침투 전략'];
      const competitiveKeywords = ['경쟁 환경', 'Competitive', '경쟁사', '경쟁 분석', '경쟁 구도'];
      const growthKeywords = ['성장 동력', 'Growth', '성장 요인', '시장 성장', '성장 전략'];
      const riskKeywords = ['위험 요소', 'Risk', '리스크', '위험 분석', '위험 요인'];
      
      reportData.market_penetration = findSectionByKeywords(sections, marketPenetrationKeywords) || '';
      reportData.competitive_landscape = findSectionByKeywords(sections, competitiveKeywords) || '';
      reportData.market_growth_drivers = findSectionByKeywords(sections, growthKeywords) || '';
      reportData.risk_factors = findSectionByKeywords(sections, riskKeywords) || '';
      
      console.log('💾 [DB저장] 시장분석 필드 매핑 완료:', {
        market_penetration: reportData.market_penetration?.length || 0,
        competitive_landscape: reportData.competitive_landscape?.length || 0,
        market_growth_drivers: reportData.market_growth_drivers?.length || 0,
        risk_factors: reportData.risk_factors?.length || 0
      });
      
    } else if (analysisType === 'business_insights') {
      const sections = structuredAnalysis?.sections || [];
      
      // 더 정확한 섹션 매칭을 위한 키워드 배열
      const revenueKeywords = ['수익 모델', 'Revenue', '매출 모델', '수익 구조', '비즈니스 모델'];
      const royaltyKeywords = ['로열티', 'Royalty', '라이선스', '특허 수익', '지적재산 수익'];
      const opportunityKeywords = ['비즈니스 기회', 'Business Opportunities', '사업 기회', '새로운 기회'];
      const competitorResponseKeywords = ['경쟁사 대응', 'Competitor Response', '경쟁 대응', '대응 전략'];
      
      reportData.revenue_model = findSectionByKeywords(sections, revenueKeywords) || '';
      reportData.royalty_margin = findSectionByKeywords(sections, royaltyKeywords) || '';
      reportData.new_business_opportunities = findSectionByKeywords(sections, opportunityKeywords) || '';
      reportData.competitor_response_strategy = findSectionByKeywords(sections, competitorResponseKeywords) || '';
      
      console.log('💾 [DB저장] 비즈니스 인사이트 필드 매핑 완료:', {
        revenue_model: reportData.revenue_model?.length || 0,
        royalty_margin: reportData.royalty_margin?.length || 0,
        new_business_opportunities: reportData.new_business_opportunities?.length || 0,
        competitor_response_strategy: reportData.competitor_response_strategy?.length || 0
      });
    }

    // 데이터 유효성 검증
    if (!reportData.application_number || !reportData.invention_title) {
      throw new Error('Required fields missing: application_number or invention_title');
    }

    console.log('💾 [DB저장] Supabase 삽입 시작...');
    const startTime = Date.now();
    
    const { data, error } = await supabase
      .from('ai_analysis_reports')
      .insert([reportData])
      .select();

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (error) {
      console.error('❌ [DB저장] Supabase 에러:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        duration: `${duration}ms`,
        retryCount: retryCount + 1
      });
      
      // 재시도 가능한 에러인지 확인
      const retryableErrors = ['PGRST301', 'PGRST302', '23505', '40001', '40P01'];
      const isRetryable = retryableErrors.some(code => error.code?.includes(code)) || 
                         error.message?.includes('timeout') || 
                         error.message?.includes('connection');
      
      if (isRetryable && retryCount < maxRetries) {
        console.log(`🔄 [DB저장] 재시도 가능한 에러 - ${retryDelay}ms 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
        return saveReportToDatabase(patentInfo, analysisType, structuredAnalysis, userId, retryCount + 1);
      }
      
      throw new Error(`Database save failed: ${error.message}`);
    }

    console.log('✅ [DB저장] 성공!', {
      id: data[0]?.id,
      application_number: data[0]?.application_number,
      user_id: data[0]?.user_id,
      duration: `${duration}ms`,
      retryCount: retryCount + 1,
      timestamp: new Date().toISOString()
    });
    
    // user_activities 테이블에 AI 분석 활동 기록 추가
    if (data[0] && userId && userId !== 'anonymous') {
      try {
        console.log('📝 [활동기록] AI 분석 활동 기록 시작...');
        const activityData = {
          user_id: userId,
          activity_type: 'ai_analysis',
          activity_data: {
            application_number: patentInfo.applicationNumber,
            analysis_type: analysisType,
            patent_title: patentInfo.inventionTitle,
            report_id: data[0].id,
            timestamp: new Date().toISOString()
          }
        };

        const { data: activityResult, error: activityError } = await supabase
          .from('user_activities')
          .insert(activityData)
          .select();

        if (activityError) {
          console.error('❌ [활동기록] AI 분석 활동 추적 실패:', activityError);
        } else {
          console.log('✅ [활동기록] AI 분석 활동 추적 성공:', activityResult);
        }
      } catch (activityTrackError) {
        console.error('❌ [활동기록] AI 분석 활동 추적 예외:', activityTrackError);
      }
    }
    
    return data[0];
    
  } catch (error) {
    console.error('❌ [DB저장] 예외 발생:', {
      error: error.message,
      stack: error.stack,
      retryCount: retryCount + 1,
      analysisType,
      userId,
      timestamp: new Date().toISOString()
    });
    
    // 재시도 로직
    if (retryCount < maxRetries && !error.message?.includes('Required fields missing')) {
      console.log(`🔄 [DB저장] 예외 재시도 - ${retryDelay}ms 후 재시도...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
      return saveReportToDatabase(patentInfo, analysisType, structuredAnalysis, userId, retryCount + 1);
    }
    
    // 최대 재시도 횟수 초과 또는 재시도 불가능한 에러
    console.error('❌ [DB저장] 최종 실패 - 재시도 횟수 초과 또는 치명적 에러');
    return null;
  }
}

// 키워드 배열을 사용하여 섹션을 찾는 헬퍼 함수
function findSectionByKeywords(sections, keywords) {
  if (!sections || !Array.isArray(sections)) return '';
  
  for (const keyword of keywords) {
    const section = sections.find(s => 
      s.title?.includes(keyword) || 
      s.content?.includes(keyword)
    );
    if (section) {
      return section.content || '';
    }
  }
  
  return '';
}

// Supabase에 저장된 ai_analysis_reports 행을 구조화된 응답으로 변환하는 헬퍼
function buildStructuredReportFromRow(row, analysisType = 'comprehensive') {
  const sections = [];

  // 시장 분석 섹션 매핑
  if (row.market_penetration) {
    sections.push({ title: '시장 침투', content: row.market_penetration });
  }
  if (row.competitive_landscape) {
    sections.push({ title: '경쟁 환경', content: row.competitive_landscape });
  }
  if (row.market_growth_drivers) {
    sections.push({ title: '성장 동력', content: row.market_growth_drivers });
  }
  if (row.risk_factors) {
    sections.push({ title: '위험 요소', content: row.risk_factors });
  }

  // 비즈니스 인사이트 섹션 매핑
  if (row.revenue_model) {
    sections.push({ title: '수익 모델', content: row.revenue_model });
  }
  if (row.royalty_margin) {
    sections.push({ title: '로열티/마진', content: row.royalty_margin });
  }
  if (row.new_business_opportunities) {
    sections.push({ title: '새로운 비즈니스 기회', content: row.new_business_opportunities });
  }
  if (row.competitor_response_strategy) {
    sections.push({ title: '경쟁사 대응 전략', content: row.competitor_response_strategy });
  }

  // 기본 정보 및 스켈레톤 보강
  const reportName = sections.length > 0 ? 'Comprehensive Analysis (cached)' : 'Comprehensive Analysis (basic)';

  return {
    analysisType,
    patentNumber: row.application_number || 'UNKNOWN',
    patentTitle: row.invention_title || 'Untitled Patent',
    analysisDate: row.created_at || new Date().toISOString(),
    analysis: {
      reportType: 'Comprehensive',
      reportName,
      sections,
      generatedAt: row.created_at || new Date().toISOString(),
      insightsSummary: '',
      keyInsights: []
    },
    rawAnalysis: JSON.stringify(row)
  };
}