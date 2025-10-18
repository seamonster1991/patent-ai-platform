import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase 클라이언트 초기화 (서버 환경 변수 우선 사용, 프론트 빌드 변수는 폴백)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;
try {
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  } else {
    console.warn('[search.js] Supabase 환경변수가 누락되어 활동 로그를 건너뜁니다.', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    });
  }
} catch (e) {
  console.warn('[search.js] Supabase 클라이언트 초기화 실패, 활동 로그를 건너뜁니다:', e?.message || e);
  supabase = null;
}

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET 요청 처리 (특허 상세정보)
  if (req.method === 'GET') {
    return handlePatentDetail(req, res);
  }

  // POST 요청 처리 (특허 검색)
  if (req.method === 'POST') {
    return handlePatentSearch(req, res);
  }

  return res.status(405).json({ 
    success: false, 
    error: 'Method not allowed',
    message: 'Only GET and POST methods are allowed'
  });
}

// 특허 상세정보 처리 함수 (detail.js에서 통합)
async function handlePatentDetail(req, res) {
  const { applicationNumber } = req.query;

  if (!applicationNumber) {
    return res.status(400).json({ 
      error: 'applicationNumber parameter is required' 
    });
  }

  try {
    console.log(`📋 특허 상세정보 요청: ${applicationNumber}`);

    // 사용자 활동 로깅
    const userId = req.query.userId;
    if (userId && supabase) {
      try {
        await supabase
          .from('user_activities')
          .insert({
            user_id: userId,
            activity_type: 'patent_detail_view',
            activity_data: { applicationNumber },
            created_at: new Date().toISOString()
          });
        console.log(`✅ 사용자 활동 로그 저장 완료: ${userId} - ${applicationNumber}`);
      } catch (logError) {
        console.warn('⚠️ 사용자 활동 로그 저장 실패:', logError.message);
      }
    }

    // KIPRIS API에서 특허 상세정보 조회
    const patentDetail = await fetchPatentDetailFromKipris(applicationNumber);
    
    if (!patentDetail) {
      console.warn(`⚠️ 특허 정보를 찾을 수 없음: ${applicationNumber}`);
      return res.status(404).json({
        success: false,
        error: 'Patent not found',
        message: `특허번호 ${applicationNumber}에 대한 정보를 찾을 수 없습니다.`,
        details: 'KIPRIS API에서 해당 특허 정보를 조회할 수 없습니다.'
      });
    }

    console.log(`✅ 특허 상세정보 조회 완료: ${applicationNumber}`);
    
    // 프론트엔드가 기대하는 구조로 변환
    const formattedPatentDetail = {
      biblioSummaryInfoArray: {
        biblioSummaryInfo: {
          applicationNumber: patentDetail.applicationNumber,
          inventionTitle: patentDetail.inventionTitle,
          inventionTitleEng: patentDetail.inventionTitleEng,
          publicationNumber: patentDetail.publicationNumber,
          publicationDate: patentDetail.publicationDate,
          registrationNumber: patentDetail.registrationNumber,
          registrationDate: patentDetail.registrationDate,
          applicationDate: patentDetail.applicationDate,
          priorityApplicationNumber: patentDetail.priorityApplicationNumber,
          priorityApplicationDate: patentDetail.priorityApplicationDate,
          registerStatus: '등록',
          finalDisposal: '등록',
          openDate: patentDetail.publicationDate,
          registerNumber: patentDetail.registrationNumber
        }
      },
      ipcInfoArray: patentDetail.ipcInfo,
      familyInfoArray: patentDetail.familyInfo,
      abstractInfoArray: patentDetail.abstractInfo,
      internationalInfoArray: patentDetail.internationalInfo,
      claimInfoArray: patentDetail.claimInfo,
      applicantInfoArray: patentDetail.applicantInfo,
      inventorInfoArray: patentDetail.inventorInfo,
      agentInfoArray: patentDetail.agentInfo,
      priorityInfoArray: patentDetail.priorityInfo,
      designatedStateInfoArray: patentDetail.designatedStateInfo,
      priorArtDocumentsInfoArray: patentDetail.priorArtDocumentsInfo,
      legalStatusInfoArray: patentDetail.legalStatusInfo,
      rndInfoArray: patentDetail.rndInfo
    };
    
    return res.status(200).json({
      success: true,
      data: {
        body: {
          item: formattedPatentDetail
        }
      }
    });

  } catch (error) {
    console.error(`❌ 특허 상세정보 조회 실패 (${applicationNumber}):`, {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '특허 상세정보를 조회하는 중 오류가 발생했습니다.',
      details: error.message,
      applicationNumber: applicationNumber
    });
  }
}

// 특허 검색 처리 함수
async function handlePatentSearch(req, res) {
  try {
    console.log('=== KIPRIS API 검색 요청 시작 ===');
    console.log('Request body:', req.body);

    // 환경변수에서 KIPRIS API 키 가져오기 (KIPRIS_SERVICE_KEY 사용)
    const kiprisApiKey = process.env.KIPRIS_SERVICE_KEY || process.env.KIPRIS_API_KEY;
    
    if (!kiprisApiKey) {
      console.error('KIPRIS API key not found in environment variables');
      return res.status(500).json({
        success: false,
        error: 'API configuration error',
        message: 'KIPRIS API key is not configured'
      });
    }

    console.log('KIPRIS API Key found:', kiprisApiKey ? 'Yes' : 'No');
    
    const searchParams = req.body || {};
    
    // 검색 파라미터 추출
    const {
      word,
      keyword, // 프론트엔드에서 keyword 필드도 지원
      inventionTitle,
      astrtCont,
      claimScope,
      ipcNumber,
      cpcNumber,
      applicationNumber,
      openNumber,
      publicationNumber,
      registerNumber,
      priorityApplicationNumber,
      internationalApplicationNumber,
      internationOpenNumber,
      applicationDate,
      openDate,
      publicationDate,
      registerDate,
      priorityApplicationDate,
      internationalApplicationDate,
      internationOpenDate,
      applicant,
      inventors,
      agent,
      rightHoler,
      patent,
      utility,
      lastvalue,
      pageNo = 1,
      numOfRows = 10,
      sortSpec,
      descSort,
      userId
    } = req.body;

    // word와 keyword 필드 통합 처리
    const searchWord = word || keyword;
    
    // 서버리스 환경(Vercel 등) 고려한 타임아웃 설정
    const isVercel = !!process.env.VERCEL;
    const TIMEOUT_MS = Number(process.env.KIPRIS_TIMEOUT_MS) || (isVercel ? 8000 : 30000);
    
    // KIPRIS OpenAPI URL (실제 작동하는 엔드포인트)
    const kiprisApiUrl = 'http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getAdvancedSearch';
    
    // 검색 파라미터 준비 (KIPRIS API 공식 스펙에 따라)
    const params = new URLSearchParams();
    
    // KIPRIS OpenAPI 필수 파라미터
    params.append('ServiceKey', kiprisApiKey);
    
    // 검색 조건 검증 - 최소 하나의 검색 필드가 있어야 함
    const hasSearchTerm = searchWord?.trim() || 
                         inventionTitle?.trim() || 
                         astrtCont?.trim() || 
                         claimScope?.trim() || 
                         ipcNumber?.trim() ||
                         cpcNumber?.trim() ||
                         applicationNumber?.trim() ||
                         openNumber?.trim() ||
                         publicationNumber?.trim() ||
                         registerNumber?.trim() ||
                         priorityApplicationNumber?.trim() ||
                         internationalApplicationNumber?.trim() ||
                         internationOpenNumber?.trim() ||
                         applicant?.trim() ||
                         inventors?.trim() ||
                         agent?.trim() ||
                         rightHoler?.trim();

    if (!hasSearchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: '최소 하나의 검색 조건을 입력해주세요.'
      });
    }

    console.log('🔍 [DEBUG] searchParams:', searchParams);
    
    // 검색 정확도 향상을 위한 스마트 검색 로직
    // 1. 사용자가 특정 필드를 지정한 경우 해당 필드만 사용
    // 2. 일반 검색어(word)는 다른 특정 필드가 없을 때만 사용
    
    let hasSpecificField = false;
    
    // 2. 발명의명칭 (inventionTitle) - 가장 정확한 검색
    if (inventionTitle?.trim()) {
      params.append('inventionTitle', inventionTitle.trim());
      hasSpecificField = true;
      console.log('🎯 발명의명칭 검색:', inventionTitle.trim());
    }
    
    // 3. 초록 (astrtCont)
    if (astrtCont?.trim()) {
      params.append('astrtCont', astrtCont.trim());
      hasSpecificField = true;
      console.log('🎯 초록 검색:', astrtCont.trim());
    }
    
    // 4. 청구범위 (claimScope)
    if (claimScope?.trim()) {
      params.append('claimScope', claimScope.trim());
      hasSpecificField = true;
      console.log('🎯 청구범위 검색:', claimScope.trim());
    }
    
    // 5. IPC코드 (ipcNumber)
    if (ipcNumber?.trim()) {
      params.append('ipcNumber', ipcNumber.trim());
      hasSpecificField = true;
      console.log('🎯 IPC코드 검색:', ipcNumber.trim());
    }
    
    // CPC 분류코드
    if (cpcNumber?.trim()) {
      params.append('cpcNumber', cpcNumber.trim());
      hasSpecificField = true;
      console.log('🎯 CPC코드 검색:', cpcNumber.trim());
    }
    
    // 1. 전체검색/자유검색 (word) - 특정 필드가 없을 때만 사용
    if (searchWord?.trim() && !hasSpecificField) {
      params.append('word', searchWord.trim());
      console.log('🔍 전체검색:', searchWord.trim());
    } else if (searchWord?.trim() && hasSpecificField) {
      console.log('⚠️ 특정 필드가 지정되어 전체검색(word)은 제외됨');
    }
    
    // 번호 검색 필드들 (정확한 매칭이 필요한 필드들)
    // 6. 출원번호 (applicationNumber)
    if (applicationNumber?.trim()) {
      params.append('applicationNumber', applicationNumber.trim());
      hasSpecificField = true;
      console.log('🎯 출원번호 검색:', applicationNumber.trim());
    }
    
    // 7. 공개번호 (openNumber)
    if (openNumber?.trim()) {
      params.append('openNumber', openNumber.trim());
      hasSpecificField = true;
      console.log('🎯 공개번호 검색:', openNumber.trim());
    }
    
    // 8. 공고번호 (publicationNumber)
    if (publicationNumber?.trim()) {
      params.append('publicationNumber', publicationNumber.trim());
      hasSpecificField = true;
      console.log('🎯 공고번호 검색:', publicationNumber.trim());
    }
    
    // 9. 등록번호 (registerNumber)
    if (registerNumber?.trim()) {
      params.append('registerNumber', registerNumber.trim());
      hasSpecificField = true;
      console.log('🎯 등록번호 검색:', registerNumber.trim());
    }
    
    // 10. 우선권주장번호 (priorityApplicationNumber)
    if (priorityApplicationNumber?.trim()) {
      params.append('priorityApplicationNumber', priorityApplicationNumber.trim());
      hasSpecificField = true;
      console.log('🎯 우선권주장번호 검색:', priorityApplicationNumber.trim());
    }
    
    // 11. 국제출원번호 (internationalApplicationNumber)
    if (internationalApplicationNumber?.trim()) {
      params.append('internationalApplicationNumber', internationalApplicationNumber.trim());
      hasSpecificField = true;
      console.log('🎯 국제출원번호 검색:', internationalApplicationNumber.trim());
    }
    
    // 12. 국제공개번호 (internationOpenNumber)
    if (internationOpenNumber?.trim()) {
      params.append('internationOpenNumber', internationOpenNumber.trim());
      hasSpecificField = true;
      console.log('🎯 국제공개번호 검색:', internationOpenNumber.trim());
    }
    
    // 13-19. 날짜 필드들
    if (applicationDate?.trim()) {
      params.append('applicationDate', applicationDate.trim());
    }
    if (openDate?.trim()) {
      params.append('openDate', openDate.trim());
    }
    if (publicationDate?.trim()) {
      params.append('publicationDate', publicationDate.trim());
    }
    if (registerDate?.trim()) {
      params.append('registerDate', registerDate.trim());
    }
    if (priorityApplicationDate?.trim()) {
      params.append('priorityApplicationDate', priorityApplicationDate.trim());
    }
    if (internationalApplicationDate?.trim()) {
      params.append('internationalApplicationDate', internationalApplicationDate.trim());
    }
    if (internationOpenDate?.trim()) {
      params.append('internationOpenDate', internationOpenDate.trim());
    }
    
    // 인명 정보 필드들
    if (applicant?.trim()) {
      params.append('applicant', applicant.trim());
      hasSpecificField = true;
      console.log('🎯 출원인 검색:', applicant.trim());
    }
    if (inventors?.trim()) {
      params.append('inventors', inventors.trim());
      hasSpecificField = true;
      console.log('🎯 발명자 검색:', inventors.trim());
    }
    if (agent?.trim()) {
      params.append('agent', agent.trim());
      hasSpecificField = true;
      console.log('🎯 대리인 검색:', agent.trim());
    }
    if (rightHoler?.trim()) {
      params.append('rightHoler', rightHoler.trim());
      hasSpecificField = true;
      console.log('🎯 등록권자 검색:', rightHoler.trim());
    }
    
    // 24-25. 특허/실용신안 구분
    if (patent !== undefined) {
      params.append('patent', patent.toString());
    }
    if (utility !== undefined) {
      params.append('utility', utility.toString());
    }
    
    // 행정처분 상태 (lastvalue)
    if (lastvalue?.trim()) {
      params.append('lastvalue', lastvalue.trim());
    }
    
    // 페이지네이션 파라미터
    const requestPageNo = Math.max(1, parseInt(pageNo) || 1);
    const requestNumOfRows = Math.min(500, Math.max(1, parseInt(numOfRows) || 30));
    params.append('pageNo', requestPageNo.toString());
    params.append('numOfRows', requestNumOfRows.toString());
    
    // 정렬 파라미터
    if (sortSpec?.trim()) {
      params.append('sortSpec', sortSpec.trim());
    }
    if (descSort !== undefined) {
      params.append('descSort', descSort.toString());
    }
    
    const fullUrl = `${kiprisApiUrl}?${params.toString()}`;
    console.log('📡 KIPRIS API 호출 URL:', fullUrl.replace(kiprisApiKey, '[SERVICE_KEY]'));
    
    // 실제 KIPRIS API 호출
    console.log('🔍 KIPRIS API 호출 중...');
    
    let kiprisResponse;
    try {
      const response = await axios.get(fullUrl, {
        timeout: TIMEOUT_MS,
        headers: {
          'User-Agent': 'Patent-AI-System/1.0',
          'Accept': 'application/xml'
        }
      });
      
      console.log('📡 KIPRIS API 응답 상태:', response.status);
      console.log('📡 KIPRIS API 응답 데이터 (일부):', response.data.substring(0, 500));
      
      // XML 응답을 JSON으로 파싱
      kiprisResponse = await parseStringPromise(response.data);
      console.log('📊 파싱된 KIPRIS 응답:', JSON.stringify(kiprisResponse, null, 2).substring(0, 1000));
      
      // 응답을 파일로 저장하여 구조 분석
      try {
        const responseFilePath = path.join(__dirname, '..', 'kipris_response_debug.json');
        fs.writeFileSync(responseFilePath, JSON.stringify(kiprisResponse, null, 2));
        console.log('📁 KIPRIS 응답이 파일로 저장됨:', responseFilePath);
      } catch (fileError) {
        console.warn('⚠️ 응답 파일 저장 실패:', fileError.message);
      }
      
    } catch (apiError) {
      console.error('❌ KIPRIS API 호출 실패:', apiError.message);
      
      // API 호출 실패 시 의미있는 에러 메시지 반환
      let errorMessage = 'KIPRIS API 호출 중 오류가 발생했습니다.';
      if (apiError.code === 'ECONNABORTED') {
        errorMessage = 'KIPRIS API 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
      } else if (apiError.response?.status === 429) {
        errorMessage = 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
      } else if (apiError.response?.status >= 500) {
        errorMessage = 'KIPRIS 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.';
      }
      
      return res.status(503).json({
        success: false,
        error: 'KIPRIS_API_ERROR',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? apiError.message : undefined
      });
    }
    
    // KIPRIS API 응답에서 특허 데이터 추출
    console.log('🔍 ===== extractPatentsFromKiprisResponse 함수 호출 전 =====');
    const rawPatents = extractPatentsFromKiprisResponse(kiprisResponse);
    console.log('🔍 ===== extractPatentsFromKiprisResponse 함수 호출 후 =====');
    console.log('🔍 rawPatents 개수:', rawPatents.length);
    console.log('🔍 rawPatents 첫 번째 아이템:', rawPatents[0]);
    
    console.log('🔍 ===== extractTotalCountFromKiprisResponse 함수 호출 전 =====');
    console.log('🔍 kiprisResponse 타입:', typeof kiprisResponse);
    console.log('🔍 kiprisResponse 키들:', Object.keys(kiprisResponse || {}));
    const totalCount = extractTotalCountFromKiprisResponse(kiprisResponse);
    console.log('🔍 ===== extractTotalCountFromKiprisResponse 함수 호출 후 =====');
    console.log('🔍 반환된 totalCount:', totalCount);
    
    // 검색 정확도 향상을 위한 결과 필터링 (임시 비활성화)
    console.log('🔍 [DEBUG] filterRelevantPatents 함수 호출 전 rawPatents 개수:', rawPatents.length);
    const patents = rawPatents; // filterRelevantPatents(rawPatents, searchParams);
    
    console.log(`✅ 특허 검색 완료: 총 ${totalCount}건 중 ${rawPatents.length}건 추출, ${patents.length}건 필터링 후 반환`);
    console.log('🔍 추출된 특허 데이터 개수:', patents.length);
    console.log('🔍 [DEBUG] patents 배열:', JSON.stringify(patents, null, 2));
    console.log('🔍 [DEBUG] totalCount:', totalCount);

    const processedData = {
      totalCount,
      patents,
      searchQuery: searchWord || '',
      searchTime: new Date().toISOString(),
      source: 'kipris_api',
      currentPage: requestPageNo,
      pageSize: requestNumOfRows,
      totalPages: Math.ceil(totalCount / requestNumOfRows)
    };
    
    console.log('🔍 [DEBUG] processedData:', JSON.stringify(processedData, null, 2));
    
    // 검색 기록 저장 (중복 방지 로직 포함)
    console.log('🔍 [DEBUG] 검색 기록 저장 시작:', { userId, hasSupabase: !!supabase });
    if (userId && supabase) {
      await saveSearchHistoryWithRetry(userId, processedData, req.body, patents);
    } else {
      console.log('⚠️ 검색 기록 저장 건너뜀:', { userId, hasSupabase: !!supabase });
    }



    // KIPRIS API 형식에 맞게 응답 구조 변경
    return res.status(200).json({
      success: true,
      data: {
        header: {
          requestMsgID: 'patent_search_' + Date.now(),
          responseTime: new Date().toISOString(),
          responseMsgID: 'response_' + Date.now(),
          successYN: 'Y',
          resultCode: '00',
          resultMsg: '정상처리되었습니다.'
        },
        body: {
          items: processedData.patents,
          count: {
            totalCount: processedData.totalCount,
            pageNo: processedData.currentPage,
            numOfRows: processedData.pageSize
          }
        }
      }
    });
    
  } catch (error) {
    console.error('❌ KIPRIS API Error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // 에러 타입에 따른 메시지 처리
    let errorMessage = 'KIPRIS API 호출 중 오류가 발생했습니다.';
    let errorCode = 'UNKNOWN_ERROR';
    let statusCode = 500;
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'KIPRIS API 응답 시간이 초과되었습니다.';
      errorCode = 'TIMEOUT_ERROR';
      statusCode = 408;
    } else if (error.response) {
      // KIPRIS에서 반환된 상태 코드를 존중하여 매핑
      const s = error.response.status;
      if (s >= 500) {
        errorMessage = 'KIPRIS 서비스 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        statusCode = 503;
        errorCode = 'KIPRIS_SERVER_ERROR';
      } else if (s === 404) {
        errorMessage = '검색 결과가 없거나 요청한 리소스를 찾을 수 없습니다.';
        statusCode = 404;
        errorCode = 'NOT_FOUND';
      } else if (s === 400) {
        errorMessage = '요청 파라미터가 유효하지 않습니다.';
        statusCode = 400;
        errorCode = 'BAD_REQUEST';
      } else {
        errorMessage = `KIPRIS API 오류: ${s} ${error.response.statusText}`;
        statusCode = s;
        errorCode = 'API_RESPONSE_ERROR';
      }
    } else if (error.request) {
      errorMessage = 'KIPRIS API 서버에 연결할 수 없습니다.';
      errorCode = 'CONNECTION_ERROR';
      statusCode = 503;
    }

    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message,
      errorCode: errorCode
    });
  }
};

// 검색 기록 저장 함수
async function saveSearchHistory(userId, searchQuery, resultsCount) {
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  try {
    const { error } = await supabase
      .from('search_history')
      .insert({
        user_id: userId,
        keyword: searchQuery,
        results_count: resultsCount,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw error;
    }

    console.log('✅ 검색 기록 저장 성공:', { userId, searchQuery, resultsCount });
  } catch (error) {
    console.error('❌ 검색 기록 저장 실패:', error);
    throw error;
  }
}

// 재시도 로직이 포함된 검색 기록 저장 함수
async function saveSearchHistoryWithRetry(userId, processedData, searchParams, patents) {
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [saveSearchHistoryWithRetry] 시도 ${attempt}/${maxRetries}`);
      
      const searchKeyword = processedData.searchQuery;
      const resultsCount = processedData.totalCount;
      
      // 중복 검색 방지를 위한 간단한 시간 기반 체크 (JSON 오류 방지)
      console.log(`🔍 [saveSearchHistoryWithRetry] 시도 ${attempt} - 중복 검색 확인 건너뜀 (JSON 오류 방지)`);
      // 중복 검색 확인을 일시적으로 비활성화하여 DB 저장 테스트 진행

      // user_activities 테이블에 기록
      const activityData = {
        user_id: userId,
        activity_type: 'search',
        activity_data: {
          keyword: searchKeyword,
          filters: searchParams,
          results_count: resultsCount,
          total_count: processedData.totalCount,
          timestamp: new Date().toISOString()
        }
      };
      
      console.log(`🔍 [saveSearchHistoryWithRetry] 시도 ${attempt} - user_activities 삽입할 데이터:`, JSON.stringify(activityData, null, 2));
      
      const { data: activityResult, error: activityError } = await supabase
        .from('user_activities')
        .insert(activityData)
        .select();
      
      if (activityError) {
        throw new Error(`user_activities 삽입 실패: ${activityError.message}`);
      }
      
      console.log(`✅ [saveSearchHistoryWithRetry] 시도 ${attempt} - user_activities 삽입 성공:`, activityResult);

      // search_history 테이블에 기록 (IPC/CPC 분석용)
      if (patents && patents.length > 0) {
        // 검색 결과에서 IPC/CPC 코드 추출
        const ipcCodes = [];
        const cpcCodes = [];
        
        patents.forEach(patent => {
          // IPC 코드 추출
          if (patent.ipcNumber && Array.isArray(patent.ipcNumber)) {
            ipcCodes.push(...patent.ipcNumber);
          } else if (patent.ipcNumber) {
            ipcCodes.push(patent.ipcNumber);
          }
          
          // CPC 코드 추출
          if (patent.cpcNumber && Array.isArray(patent.cpcNumber)) {
            cpcCodes.push(...patent.cpcNumber);
          } else if (patent.cpcNumber) {
            cpcCodes.push(patent.cpcNumber);
          }
        });

        // 기술 분야 분류 (classify_technology_field 함수 사용)
        const { data: classificationResult, error: classificationError } = await supabase
          .rpc('classify_technology_field', {
            p_search_text: searchKeyword,
            p_ipc_codes: [...new Set(ipcCodes)], // 중복 제거
            p_cpc_codes: [...new Set(cpcCodes)]  // 중복 제거
          });

        let technologyField = '기타';
        let fieldConfidence = 0.5;
        
        if (!classificationError && classificationResult) {
          technologyField = classificationResult.technology_field || '기타';
          fieldConfidence = classificationResult.confidence || 0.5;
        } else {
          console.warn(`⚠️ [saveSearchHistoryWithRetry] 기술 분야 분류 실패:`, classificationError);
          // 폴백: 로컬 분류 함수 사용
          const localFields = extractTechnologyFieldsFromSearch(searchKeyword, ipcCodes, cpcCodes);
          technologyField = localFields[0] || '기타';
        }

        console.log(`🔍 [saveSearchHistoryWithRetry] 시도 ${attempt} - 분류된 기술 분야:`, {
          technologyField,
          fieldConfidence,
          ipcCodes: [...new Set(ipcCodes)],
          cpcCodes: [...new Set(cpcCodes)]
        });

        const searchHistoryData = {
          user_id: userId,
          keyword: searchKeyword,
          results_count: resultsCount,
          technology_field: technologyField,
          field_confidence: fieldConfidence,
          ipc_codes: [...new Set(ipcCodes)], // 중복 제거
          search_filters: searchParams,
          created_at: new Date().toISOString()
        };

        console.log(`🔍 [saveSearchHistoryWithRetry] 시도 ${attempt} - search_history 삽입할 데이터:`, JSON.stringify(searchHistoryData, null, 2));

        const { data: searchResult, error: searchError } = await supabase
          .from('search_history')
          .insert(searchHistoryData)
          .select();

        if (searchError) {
          throw new Error(`search_history 삽입 실패: ${searchError.message}`);
        }
        
        console.log(`✅ [saveSearchHistoryWithRetry] 시도 ${attempt} - search_history 삽입 성공:`, searchResult);
      }
      
      console.log(`✅ [saveSearchHistoryWithRetry] 시도 ${attempt} - 검색 기록 저장 완료`);
      return; // 성공 시 함수 종료
      
    } catch (error) {
      lastError = error;
      console.error(`❌ [saveSearchHistoryWithRetry] 시도 ${attempt}/${maxRetries} 실패:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 지수 백오프: 2초, 4초, 8초
        console.log(`⏳ [saveSearchHistoryWithRetry] ${delay}ms 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 모든 재시도 실패
  console.error(`❌ [saveSearchHistoryWithRetry] 모든 재시도 실패. 마지막 오류:`, lastError?.message || lastError);
  // 검색 기록 저장 실패는 전체 응답에 영향을 주지 않으므로 throw하지 않음
}

// KIPRIS API 응답에서 특허 데이터 추출
function extractPatentsFromKiprisResponse(kiprisResponse) {
  try {
    console.log('🔍 KIPRIS 응답에서 특허 데이터 추출 시작');
    
    const response = kiprisResponse?.response;
    if (!response) {
      console.warn('⚠️ KIPRIS 응답에서 response 객체를 찾을 수 없습니다.');
      return [];
    }

    const body = response.body?.[0];
    if (!body) {
      console.warn('⚠️ KIPRIS 응답에서 body 객체를 찾을 수 없습니다.');
      return [];
    }

    // KIPRIS API 공식 응답 구조에 따른 특허 아이템 배열 추출
    // 실제 API 테스트 결과: response.body[0].items[0].item
    let patentItems = [];
    
    // 1차: 공식 API 스펙에 따른 경로
    if (body.items?.[0]?.item && Array.isArray(body.items[0].item)) {
      patentItems = body.items[0].item;
      console.log(`🔍 공식 경로(items[0].item)에서 ${patentItems.length}개 아이템 발견`);
    }
    // 2차: items가 직접 배열인 경우
    else if (body.items && Array.isArray(body.items)) {
      patentItems = body.items;
      console.log(`🔍 대체 경로(items 배열)에서 ${patentItems.length}개 아이템 발견`);
    }
    // 3차: item이 직접 있는 경우
    else if (body.item && Array.isArray(body.item)) {
      patentItems = body.item;
      console.log(`🔍 대체 경로(item 배열)에서 ${patentItems.length}개 아이템 발견`);
    }

    console.log(`🔍 추출된 특허 아이템 개수: ${patentItems.length}`);
    
    if (patentItems.length > 0) {
      console.log('🔍 첫 번째 아이템 구조 샘플:', JSON.stringify(patentItems[0], null, 2).substring(0, 300));
    }

    // 특허 데이터를 표준 형식으로 변환
    const patents = patentItems.map((item, index) => {
      try {
        const patent = {
          indexNo: getFieldValue(item.indexNo) || String(index + 1),
          registerStatus: getFieldValue(item.registerStatus) || '',
          inventionTitle: getFieldValue(item.inventionTitle) || '',
          ipcNumber: getFieldValue(item.ipcNumber) || '',
          registerNumber: getFieldValue(item.registerNumber) || '',
          registerDate: getFieldValue(item.registerDate) || '',
          applicationNumber: getFieldValue(item.applicationNumber) || '',
          applicationDate: getFieldValue(item.applicationDate) || '',
          openNumber: getFieldValue(item.openNumber) || '',
          openDate: getFieldValue(item.openDate) || '',
          publicationNumber: getFieldValue(item.publicationNumber) || '',
          publicationDate: getFieldValue(item.publicationDate) || '',
          astrtCont: getFieldValue(item.astrtCont) || '',
          drawing: getFieldValue(item.drawing) || '',
          bigDrawing: getFieldValue(item.bigDrawing) || '',
          applicantName: getFieldValue(item.applicantName) || ''
        };
        
        console.log(`🔍 변환된 특허 ${index + 1}:`, {
          title: patent.inventionTitle,
          appNum: patent.applicationNumber,
          applicant: patent.applicantName
        });
        
        return patent;
      } catch (itemError) {
        console.error(`❌ 특허 아이템 ${index} 처리 중 오류:`, itemError);
        return null;
      }
    }).filter(patent => patent !== null);

    console.log(`✅ 성공적으로 변환된 특허 데이터: ${patents.length}건`);
    return patents;
    
  } catch (error) {
    console.error('❌ 특허 데이터 추출 중 오류:', error);
    return [];
  }
}

// KIPRIS API 응답에서 총 검색 건수 추출
function extractTotalCountFromKiprisResponse(kiprisResponse) {
  console.log('🔍 [extractTotalCountFromKiprisResponse] 함수 호출됨');
  
  try {
    // KIPRIS API 공식 응답 구조에 따른 totalCount 추출
    // 실제 API 테스트 결과: response.count[0].totalCount[0]
    let totalCountValue;
    
    // 1차: 공식 API 스펙에 따른 경로
    if (kiprisResponse?.response?.count?.[0]?.totalCount?.[0]) {
      totalCountValue = kiprisResponse.response.count[0].totalCount[0];
      console.log(`🎯 [extractTotalCountFromKiprisResponse] 공식 경로에서 totalCount 추출 성공: ${totalCountValue}`);
    }
    // 2차: 배열이 아닌 경우 대비
    else if (kiprisResponse?.response?.count?.totalCount) {
      totalCountValue = kiprisResponse.response.count.totalCount;
      console.log(`🎯 [extractTotalCountFromKiprisResponse] 대체 경로에서 totalCount 추출 성공: ${totalCountValue}`);
    }
    // 3차: body 내부에 있는 경우 대비
    else if (kiprisResponse?.response?.body?.[0]?.count?.[0]?.totalCount?.[0]) {
      totalCountValue = kiprisResponse.response.body[0].count[0].totalCount[0];
      console.log(`🎯 [extractTotalCountFromKiprisResponse] body 경로에서 totalCount 추출 성공: ${totalCountValue}`);
    }
    
    if (totalCountValue === undefined || totalCountValue === null) {
      console.log('❌ [extractTotalCountFromKiprisResponse] totalCount를 찾을 수 없음');
      console.log('응답 구조:', JSON.stringify(kiprisResponse, null, 2));
      return 0;
    }

    // 문자열인 경우 숫자로 변환
    const totalCount = parseInt(totalCountValue, 10);
    
    if (isNaN(totalCount)) {
      console.log(`❌ [extractTotalCountFromKiprisResponse] totalCount 숫자 변환 실패: ${totalCountValue}`);
      return 0;
    }
    
    console.log(`✅ [extractTotalCountFromKiprisResponse] 최종 totalCount: ${totalCount}`);
    return totalCount;
    
  } catch (error) {
    console.error('❌ [extractTotalCountFromKiprisResponse] 오류 발생:', error.message);
    return 0;
  }
}

// 검색 정확도 향상을 위한 결과 필터링 함수
function filterRelevantPatents(patents, searchParams) {
  if (!patents || patents.length === 0) {
    return patents;
  }

  console.log('🔍 결과 필터링 시작:', patents.length, '건');
  
  // KIPRIS API에서 반환된 결과는 이미 관련성이 검증된 것으로 간주
  // 기본적인 데이터 품질 검증만 수행
  const filteredPatents = patents.filter((patent, index) => {
    console.log(`🔍 필터링 검사 ${index + 1}:`, {
      title: patent.inventionTitle,
      titleTrim: patent.inventionTitle?.trim(),
      appNum: patent.applicationNumber,
      appNumTrim: patent.applicationNumber?.trim()
    });
    
    // 1. 발명의 명칭이 비어있는 경우만 제외
    if (!patent.inventionTitle?.trim()) {
      console.log('🚫 발명의명칭 없음:', patent);
      return false;
    }
    
    // 2. 출원번호가 없는 경우 제외
    if (!patent.applicationNumber?.trim()) {
      console.log('🚫 출원번호 없음:', patent);
      return false;
    }
    
    console.log(`✅ 필터링 통과 ${index + 1}`);
    return true;
  });

  console.log('🔍 필터링 완료:', filteredPatents.length, '건 (', patents.length - filteredPatents.length, '건 제외)');
  return filteredPatents;
}

// KIPRIS XML 응답에서 필드 값 안전하게 추출
function getFieldValue(field) {
  if (!field) return '';
  if (typeof field === 'string') return field.trim();
  if (Array.isArray(field) && field.length > 0) {
    const value = String(field[0]).trim();
    return value;
  }
  if (typeof field === 'object' && field._) return String(field._).trim();
  return String(field).trim();
}

// 검색에서 기술 분야 추출 함수
function extractTechnologyFieldsFromSearch(searchKeyword, ipcCodes = [], cpcCodes = []) {
  const technologyFields = [];
  
  // IPC 코드에서 기술 분야 추출
  [...ipcCodes, ...cpcCodes].forEach(code => {
    if (code && typeof code === 'string') {
      const field = mapIpcToTechnologyField(code);
      if (field && !technologyFields.includes(field)) {
        technologyFields.push(field);
      }
    }
  });
  
  // 검색 키워드에서 기술 분야 추출
  const keywordFields = extractFieldsFromKeywords(searchKeyword.toLowerCase());
  keywordFields.forEach(field => {
    if (!technologyFields.includes(field)) {
      technologyFields.push(field);
    }
  });
  
  // 기본값 설정
  if (technologyFields.length === 0) {
    technologyFields.push('기타');
  }
  
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

// ===== Detail.js에서 통합된 함수들 =====

// KIPRIS API에서 특허 상세정보 조회
async function fetchPatentDetailFromKipris(applicationNumber) {
  try {
    console.log(`🔍 KIPRIS API에서 특허 상세정보 조회: ${applicationNumber}`);
    
    // 환경변수에서 KIPRIS API 키 가져오기
    const kiprisApiKey = process.env.KIPRIS_SERVICE_KEY || process.env.KIPRIS_API_KEY;
    
    if (!kiprisApiKey) {
      console.error('KIPRIS API key not found');
      throw new Error('KIPRIS API key is not configured');
    }

    // KIPRIS 특허 상세정보 API 엔드포인트 - getBibliographyDetailInfoSearch 사용
    const kiprisDetailUrl = 'http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getBibliographyDetailInfoSearch';
    
    // API 파라미터 설정 - 상세정보 조회용
    const params = new URLSearchParams();
    params.append('ServiceKey', kiprisApiKey);
    params.append('applicationNumber', applicationNumber);
    
    const fullUrl = `${kiprisDetailUrl}?${params.toString()}`;
    console.log('📡 KIPRIS 상세정보 API 호출 URL:', fullUrl.replace(kiprisApiKey, '[SERVICE_KEY]'));
    
    // API 호출
    const response = await axios.get(fullUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Patent-AI-System/1.0',
        'Accept': 'application/xml'
      }
    });
    
    console.log('📡 KIPRIS 상세정보 API 응답 상태:', response.status);
    
    // XML 응답을 JSON으로 파싱
    const kiprisResponse = await parseStringPromise(response.data);
    console.log('📊 KIPRIS Plus API 원본 XML 응답 길이:', response.data.length);
    
    // 응답 구조 상세 분석
    if (kiprisResponse?.response) {
      const header = kiprisResponse.response.header?.[0];
      const body = kiprisResponse.response.body?.[0];
      
      console.log('📋 KIPRIS API 응답 헤더:', {
        successYN: getFieldValue(header?.successYN),
        resultCode: getFieldValue(header?.resultCode),
        resultMsg: getFieldValue(header?.resultMsg),
        responseTime: getFieldValue(header?.responseTime)
      });
      
      if (body) {
        console.log('📋 응답 바디 구조:', Object.keys(body));
        if (body.item?.[0]?.biblioSummaryInfoArray?.[0]?.biblioSummaryInfo?.[0]) {
          const biblioInfo = body.item[0].biblioSummaryInfoArray[0].biblioSummaryInfo[0];
          console.log('🏷️ 추출된 특허 제목 미리보기:', {
            inventionTitle: getFieldValue(biblioInfo.inventionTitle),
            inventionTitleEng: getFieldValue(biblioInfo.inventionTitleEng),
            applicationNumber: getFieldValue(biblioInfo.applicationNumber)
          });
        }
      }
    } else {
      console.warn('⚠️ 예상과 다른 응답 구조:', Object.keys(kiprisResponse || {}));
    }
    
    // KIPRIS Plus API 서지상세정보 응답에서 특허 상세정보 추출
    const patentDetail = extractPatentDetailFromBibliographyResponse(kiprisResponse, applicationNumber);
    
    if (!patentDetail) {
      console.warn(`⚠️ KIPRIS에서 특허 정보를 찾을 수 없음: ${applicationNumber}`);
      // 폴백으로 기본 특허 정보 생성
      return generateFallbackPatentDetail(applicationNumber);
    }
    
    console.log(`✅ KIPRIS에서 특허 상세정보 조회 완료: ${applicationNumber}`);
    return patentDetail;
    
  } catch (error) {
    console.error(`❌ KIPRIS API 호출 실패 (${applicationNumber}):`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url?.replace(process.env.KIPRIS_SERVICE_KEY || process.env.KIPRIS_API_KEY || '', '[SERVICE_KEY]')
    });
    
    // API 호출 실패 시 폴백 데이터 생성
    console.log(`🔄 폴백 데이터 생성: ${applicationNumber}`);
    return generateFallbackPatentDetail(applicationNumber);
  }
}

// KIPRIS 서지상세정보 응답에서 특허 상세정보 추출
function extractPatentDetailFromBibliographyResponse(kiprisResponse, applicationNumber) {
  try {
    console.log(`🔍 서지상세정보 응답에서 특허 상세정보 추출 시작: ${applicationNumber}`);
    
    if (!kiprisResponse?.response?.body?.[0]?.item?.[0]) {
      console.warn('⚠️ 응답에서 item 정보를 찾을 수 없습니다.');
      return null;
    }
    
    const item = kiprisResponse.response.body[0].item[0];
    
    // 서지요약정보 추출
    const biblioSummaryInfo = item.biblioSummaryInfoArray?.[0]?.biblioSummaryInfo?.[0];
    if (!biblioSummaryInfo) {
      console.warn('⚠️ 서지요약정보를 찾을 수 없습니다.');
      return null;
    }
    
    // 기본 특허 정보 추출
    const patentDetail = {
      applicationNumber: getFieldValue(biblioSummaryInfo.applicationNumber) || applicationNumber,
      inventionTitle: getFieldValue(biblioSummaryInfo.inventionTitle) || '제목 정보 없음',
      inventionTitleEng: getFieldValue(biblioSummaryInfo.inventionTitleEng) || '',
      publicationNumber: getFieldValue(biblioSummaryInfo.publicationNumber) || '',
      publicationDate: getFieldValue(biblioSummaryInfo.publicationDate) || '',
      registrationNumber: getFieldValue(biblioSummaryInfo.registrationNumber) || '',
      registrationDate: getFieldValue(biblioSummaryInfo.registrationDate) || '',
      applicationDate: getFieldValue(biblioSummaryInfo.applicationDate) || '',
      priorityApplicationNumber: getFieldValue(biblioSummaryInfo.priorityApplicationNumber) || '',
      priorityApplicationDate: getFieldValue(biblioSummaryInfo.priorityApplicationDate) || '',
      
      // 배열 정보들 추출
      ipcInfo: extractIpcInfoArray(item.ipcInfoArray),
      familyInfo: extractFamilyInfoArray(item.familyInfoArray),
      abstractInfo: extractAbstractInfoArray(item.abstractInfoArray),
      internationalInfo: extractInternationalInfoArray(item.internationalInfoArray),
      claimInfo: extractClaimInfoArray(item.claimInfoArray),
      applicantInfo: extractApplicantInfoArray(item.applicantInfoArray),
      inventorInfo: extractInventorInfoArray(item.inventorInfoArray),
      agentInfo: extractAgentInfoArray(item.agentInfoArray),
      priorityInfo: extractPriorityInfoArray(item.priorityInfoArray),
      designatedStateInfo: extractDesignatedStateInfoArray(item.designatedStateInfoArray),
      priorArtDocumentsInfo: extractPriorArtDocumentsInfoArray(item.priorArtDocumentsInfoArray),
      legalStatusInfo: extractLegalStatusInfoArray(item.legalStatusInfoArray),
      rndInfo: extractRndInfoArray(item.rndInfoArray)
    };
    
    console.log(`✅ 특허 상세정보 추출 완료: ${applicationNumber}`, {
      title: patentDetail.inventionTitle,
      publicationNumber: patentDetail.publicationNumber,
      registrationNumber: patentDetail.registrationNumber
    });
    
    return patentDetail;
    
  } catch (error) {
    console.error(`❌ 특허 상세정보 추출 실패 (${applicationNumber}):`, error);
    return null;
  }
}

// 폴백 특허 상세정보 생성
function generateFallbackPatentDetail(applicationNumber) {
  console.log(`🔄 폴백 특허 상세정보 생성: ${applicationNumber}`);
  
  return {
    applicationNumber: applicationNumber,
    inventionTitle: '특허 정보를 불러올 수 없습니다',
    inventionTitleEng: 'Patent information unavailable',
    publicationNumber: '',
    publicationDate: '',
    registrationNumber: '',
    registrationDate: '',
    applicationDate: '',
    priorityApplicationNumber: '',
    priorityApplicationDate: '',
    
    ipcInfo: [],
    familyInfo: [],
    abstractInfo: [],
    internationalInfo: [],
    claimInfo: [],
    applicantInfo: [],
    inventorInfo: [],
    agentInfo: [],
    priorityInfo: [],
    designatedStateInfo: [],
    priorArtDocumentsInfo: [],
    legalStatusInfo: [],
    rndInfo: [],
    
    error: 'KIPRIS API 호출 실패로 인한 폴백 데이터',
    fallback: true
  };
}

// 배열 정보 추출 함수들
function extractIpcInfoArray(ipcInfoArray) {
  if (!ipcInfoArray?.[0]?.ipcInfo) return [];
  return ipcInfoArray[0].ipcInfo.map(extractIpcInfo);
}

function extractFamilyInfoArray(familyInfoArray) {
  if (!familyInfoArray?.[0]?.familyInfo) return [];
  return familyInfoArray[0].familyInfo.map(extractFamilyInfo);
}

function extractAbstractInfoArray(abstractInfoArray) {
  if (!abstractInfoArray?.[0]?.abstractInfo) return [];
  return abstractInfoArray[0].abstractInfo.map(info => ({
    abstractContent: getFieldValue(info.abstractContent) || ''
  }));
}

function extractInternationalInfoArray(internationalInfoArray) {
  if (!internationalInfoArray?.[0]?.internationalInfo) return [];
  return internationalInfoArray[0].internationalInfo.map(extractInternationalInfo);
}

function extractClaimInfoArray(claimInfoArray) {
  if (!claimInfoArray?.[0]?.claimInfo) return [];
  return claimInfoArray[0].claimInfo.map(info => ({
    claimContent: getFieldValue(info.claimContent) || ''
  }));
}

function extractApplicantInfoArray(applicantInfoArray) {
  if (!applicantInfoArray?.[0]?.applicantInfo) return [];
  return applicantInfoArray[0].applicantInfo.map(extractApplicantInfo);
}

function extractInventorInfoArray(inventorInfoArray) {
  if (!inventorInfoArray?.[0]?.inventorInfo) return [];
  return inventorInfoArray[0].inventorInfo.map(extractInventorInfo);
}

function extractAgentInfoArray(agentInfoArray) {
  if (!agentInfoArray?.[0]?.agentInfo) return [];
  return agentInfoArray[0].agentInfo.map(extractAgentInfo);
}

function extractPriorityInfoArray(priorityInfoArray) {
  if (!priorityInfoArray?.[0]?.priorityInfo) return [];
  return priorityInfoArray[0].priorityInfo.map(extractPriorityInfo);
}

function extractDesignatedStateInfoArray(designatedStateInfoArray) {
  if (!designatedStateInfoArray?.[0]?.designatedStateInfo) return [];
  return designatedStateInfoArray[0].designatedStateInfo.map(extractDesignatedStateInfo);
}

function extractPriorArtDocumentsInfoArray(priorArtDocumentsInfoArray) {
  if (!priorArtDocumentsInfoArray?.[0]?.priorArtDocumentsInfo) return [];
  return priorArtDocumentsInfoArray[0].priorArtDocumentsInfo.map(extractPriorArtDocumentsInfo);
}

function extractLegalStatusInfoArray(legalStatusInfoArray) {
  if (!legalStatusInfoArray?.[0]?.legalStatusInfo) return [];
  return legalStatusInfoArray[0].legalStatusInfo.map(extractLegalStatusInfo);
}

function extractRndInfoArray(rndInfoArray) {
  if (!rndInfoArray?.[0]?.rndInfo) return [];
  return rndInfoArray[0].rndInfo.map(info => ({
    rndTaskNumber: getFieldValue(info.rndTaskNumber) || '',
    rndTaskName: getFieldValue(info.rndTaskName) || '',
    rndInstitutionName: getFieldValue(info.rndInstitutionName) || ''
  }));
}

// 개별 정보 추출 함수들
function extractIpcInfo(ipcInfo) {
  return {
    ipcCode: getFieldValue(ipcInfo.ipcCode) || '',
    ipcName: getFieldValue(ipcInfo.ipcName) || ''
  };
}

function extractFamilyInfo(familyInfo) {
  return {
    familyApplicationNumber: getFieldValue(familyInfo.familyApplicationNumber) || '',
    familyApplicationDate: getFieldValue(familyInfo.familyApplicationDate) || ''
  };
}

function extractInternationalInfo(internationalInfo) {
  return {
    pctApplicationNumber: getFieldValue(internationalInfo.pctApplicationNumber) || '',
    pctApplicationDate: getFieldValue(internationalInfo.pctApplicationDate) || '',
    pctPublicationNumber: getFieldValue(internationalInfo.pctPublicationNumber) || '',
    pctPublicationDate: getFieldValue(internationalInfo.pctPublicationDate) || ''
  };
}

function extractApplicantInfo(applicantInfo) {
  return {
    applicantName: getFieldValue(applicantInfo.applicantName) || '',
    applicantNameEng: getFieldValue(applicantInfo.applicantNameEng) || '',
    applicantAddress: getFieldValue(applicantInfo.applicantAddress) || '',
    applicantAddressEng: getFieldValue(applicantInfo.applicantAddressEng) || ''
  };
}

function extractInventorInfo(inventorInfo) {
  return {
    inventorName: getFieldValue(inventorInfo.inventorName) || '',
    inventorNameEng: getFieldValue(inventorInfo.inventorNameEng) || '',
    inventorAddress: getFieldValue(inventorInfo.inventorAddress) || '',
    inventorAddressEng: getFieldValue(inventorInfo.inventorAddressEng) || ''
  };
}

function extractAgentInfo(agentInfo) {
  return {
    agentName: getFieldValue(agentInfo.agentName) || '',
    agentAddress: getFieldValue(agentInfo.agentAddress) || ''
  };
}

function extractPriorityInfo(priorityInfo) {
  return {
    priorityApplicationNumber: getFieldValue(priorityInfo.priorityApplicationNumber) || '',
    priorityApplicationDate: getFieldValue(priorityInfo.priorityApplicationDate) || '',
    priorityApplicationCountry: getFieldValue(priorityInfo.priorityApplicationCountry) || ''
  };
}

function extractDesignatedStateInfo(designatedStateInfo) {
  return {
    designatedState: getFieldValue(designatedStateInfo.designatedState) || ''
  };
}

function extractPriorArtDocumentsInfo(priorArtDocumentsInfo) {
  return {
    priorArtDocumentsNumber: getFieldValue(priorArtDocumentsInfo.priorArtDocumentsNumber) || '',
    priorArtDocumentsDate: getFieldValue(priorArtDocumentsInfo.priorArtDocumentsDate) || ''
  };
}

function extractLegalStatusInfo(legalStatusInfo) {
  return {
    legalStatus: getFieldValue(legalStatusInfo.legalStatus) || '',
    legalStatusDate: getFieldValue(legalStatusInfo.legalStatusDate) || ''
  };
}