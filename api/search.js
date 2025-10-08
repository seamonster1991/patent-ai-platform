const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const { createClient } = require('@supabase/supabase-js');

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
    const hasSearchTerm = searchParams.word?.trim() || 
                         searchParams.inventionTitle?.trim() || 
                         searchParams.astrtCont?.trim() || 
                         searchParams.claimScope?.trim() || 
                         searchParams.ipcNumber?.trim() ||
                         searchParams.cpcNumber?.trim() ||
                         searchParams.applicationNumber?.trim() ||
                         searchParams.openNumber?.trim() ||
                         searchParams.publicationNumber?.trim() ||
                         searchParams.registerNumber?.trim() ||
                         searchParams.priorityApplicationNumber?.trim() ||
                         searchParams.internationalApplicationNumber?.trim() ||
                         searchParams.internationOpenNumber?.trim() ||
                         searchParams.applicant?.trim() ||
                         searchParams.inventors?.trim() ||
                         searchParams.agent?.trim() ||
                         searchParams.rightHoler?.trim() ||
                         searchParams.keyword?.trim(); // 기존 호환성

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
    if (searchParams.inventionTitle?.trim()) {
      params.append('inventionTitle', searchParams.inventionTitle.trim());
      hasSpecificField = true;
      console.log('🎯 발명의명칭 검색:', searchParams.inventionTitle.trim());
    }
    
    // 3. 초록 (astrtCont)
    if (searchParams.astrtCont?.trim()) {
      params.append('astrtCont', searchParams.astrtCont.trim());
      hasSpecificField = true;
      console.log('🎯 초록 검색:', searchParams.astrtCont.trim());
    }
    
    // 4. 청구범위 (claimScope)
    if (searchParams.claimScope?.trim()) {
      params.append('claimScope', searchParams.claimScope.trim());
      hasSpecificField = true;
      console.log('🎯 청구범위 검색:', searchParams.claimScope.trim());
    }
    
    // 5. IPC코드 (ipcNumber)
    if (searchParams.ipcNumber?.trim()) {
      params.append('ipcNumber', searchParams.ipcNumber.trim());
      hasSpecificField = true;
      console.log('🎯 IPC코드 검색:', searchParams.ipcNumber.trim());
    }
    
    // CPC 분류코드
    if (searchParams.cpcNumber?.trim()) {
      params.append('cpcNumber', searchParams.cpcNumber.trim());
      hasSpecificField = true;
      console.log('🎯 CPC코드 검색:', searchParams.cpcNumber.trim());
    }
    
    // 1. 전체검색/자유검색 (word) - 특정 필드가 없을 때만 사용
    if (searchParams.word?.trim() && !hasSpecificField) {
      params.append('word', searchParams.word.trim());
      console.log('🔍 전체검색:', searchParams.word.trim());
    } else if (searchParams.word?.trim() && hasSpecificField) {
      console.log('⚠️ 특정 필드가 지정되어 전체검색(word)은 제외됨');
    }
    
    // 번호 검색 필드들 (정확한 매칭이 필요한 필드들)
    // 6. 출원번호 (applicationNumber)
    if (searchParams.applicationNumber?.trim()) {
      params.append('applicationNumber', searchParams.applicationNumber.trim());
      hasSpecificField = true;
      console.log('🎯 출원번호 검색:', searchParams.applicationNumber.trim());
    }
    
    // 7. 공개번호 (openNumber)
    if (searchParams.openNumber?.trim()) {
      params.append('openNumber', searchParams.openNumber.trim());
      hasSpecificField = true;
      console.log('🎯 공개번호 검색:', searchParams.openNumber.trim());
    }
    
    // 8. 공고번호 (publicationNumber)
    if (searchParams.publicationNumber?.trim()) {
      params.append('publicationNumber', searchParams.publicationNumber.trim());
      hasSpecificField = true;
      console.log('🎯 공고번호 검색:', searchParams.publicationNumber.trim());
    }
    
    // 9. 등록번호 (registerNumber)
    if (searchParams.registerNumber?.trim()) {
      params.append('registerNumber', searchParams.registerNumber.trim());
      hasSpecificField = true;
      console.log('🎯 등록번호 검색:', searchParams.registerNumber.trim());
    }
    
    // 10. 우선권주장번호 (priorityApplicationNumber)
    if (searchParams.priorityApplicationNumber?.trim()) {
      params.append('priorityApplicationNumber', searchParams.priorityApplicationNumber.trim());
      hasSpecificField = true;
      console.log('🎯 우선권주장번호 검색:', searchParams.priorityApplicationNumber.trim());
    }
    
    // 11. 국제출원번호 (internationalApplicationNumber)
    if (searchParams.internationalApplicationNumber?.trim()) {
      params.append('internationalApplicationNumber', searchParams.internationalApplicationNumber.trim());
      hasSpecificField = true;
      console.log('🎯 국제출원번호 검색:', searchParams.internationalApplicationNumber.trim());
    }
    
    // 12. 국제공개번호 (internationOpenNumber)
    if (searchParams.internationOpenNumber?.trim()) {
      params.append('internationOpenNumber', searchParams.internationOpenNumber.trim());
      hasSpecificField = true;
      console.log('🎯 국제공개번호 검색:', searchParams.internationOpenNumber.trim());
    }
    
    // 13-19. 날짜 필드들
    if (searchParams.applicationDate?.trim()) {
      params.append('applicationDate', searchParams.applicationDate.trim());
    }
    if (searchParams.openDate?.trim()) {
      params.append('openDate', searchParams.openDate.trim());
    }
    if (searchParams.publicationDate?.trim()) {
      params.append('publicationDate', searchParams.publicationDate.trim());
    }
    if (searchParams.registerDate?.trim()) {
      params.append('registerDate', searchParams.registerDate.trim());
    }
    if (searchParams.priorityApplicationDate?.trim()) {
      params.append('priorityApplicationDate', searchParams.priorityApplicationDate.trim());
    }
    if (searchParams.internationalApplicationDate?.trim()) {
      params.append('internationalApplicationDate', searchParams.internationalApplicationDate.trim());
    }
    if (searchParams.internationOpenDate?.trim()) {
      params.append('internationOpenDate', searchParams.internationOpenDate.trim());
    }
    
    // 인명 정보 필드들
    if (searchParams.applicant?.trim()) {
      params.append('applicant', searchParams.applicant.trim());
      hasSpecificField = true;
      console.log('🎯 출원인 검색:', searchParams.applicant.trim());
    }
    if (searchParams.inventors?.trim()) {
      params.append('inventors', searchParams.inventors.trim());
      hasSpecificField = true;
      console.log('🎯 발명자 검색:', searchParams.inventors.trim());
    }
    if (searchParams.agent?.trim()) {
      params.append('agent', searchParams.agent.trim());
      hasSpecificField = true;
      console.log('🎯 대리인 검색:', searchParams.agent.trim());
    }
    if (searchParams.rightHoler?.trim()) {
      params.append('rightHoler', searchParams.rightHoler.trim());
      hasSpecificField = true;
      console.log('🎯 등록권자 검색:', searchParams.rightHoler.trim());
    }
    
    // 24-25. 특허/실용신안 구분
    if (searchParams.patent !== undefined) {
      params.append('patent', searchParams.patent.toString());
    }
    if (searchParams.utility !== undefined) {
      params.append('utility', searchParams.utility.toString());
    }
    
    // 행정처분 상태 (lastvalue)
    if (searchParams.lastvalue?.trim()) {
      params.append('lastvalue', searchParams.lastvalue.trim());
    }
    
    // 페이지네이션 파라미터
    const requestPageNo = Math.max(1, parseInt(searchParams.pageNo) || 1);
    const requestNumOfRows = Math.min(500, Math.max(1, parseInt(searchParams.numOfRows) || 30));
    params.append('pageNo', requestPageNo.toString());
    params.append('numOfRows', requestNumOfRows.toString());
    
    // 정렬 파라미터
    if (searchParams.sortSpec?.trim()) {
      params.append('sortSpec', searchParams.sortSpec.trim());
    }
    if (searchParams.descSort !== undefined) {
      params.append('descSort', searchParams.descSort.toString());
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
      const fs = require('fs');
      const path = require('path');
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
      searchQuery: searchParams.word || searchParams.keyword || '',
      searchTime: new Date().toISOString(),
      source: 'kipris_api',
      currentPage: requestPageNo,
      pageSize: requestNumOfRows,
      totalPages: Math.ceil(totalCount / requestNumOfRows)
    };
    
    console.log('🔍 [DEBUG] processedData:', JSON.stringify(processedData, null, 2));
    
    // 검색 기록 저장 (중복 방지 로직 포함)
    const userId = req.body.userId;
    console.log('🔍 [DEBUG] 검색 기록 저장 시작:', { userId, hasSupabase: !!supabase });
    if (userId && supabase) {
      try {
        const searchKeyword = processedData.searchQuery;
        const resultsCount = processedData.totalCount;
        
        // 중복 검색 방지: 같은 사용자가 5분 이내에 동일한 검색어로 검색했는지 확인
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: recentSearch } = await supabase
          .from('user_activities')
          .select('id')
          .eq('user_id', userId)
          .eq('activity_type', 'search')
          .gte('created_at', fiveMinutesAgo)
          .eq('activity_data->keyword', searchKeyword)
          .limit(1);
        
        if (recentSearch && recentSearch.length > 0) {
          console.log('⚠️ 중복 검색 감지, 기록 저장 건너뜀:', searchKeyword);
        } else {
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
          
          console.log('🔍 [DEBUG] user_activities 삽입할 데이터:', JSON.stringify(activityData, null, 2));
          
          const { data, error } = await supabase
            .from('user_activities')
            .insert(activityData)
            .select();
          
          if (error) {
            console.error('❌ user_activities 삽입 오류:', error);
          } else {
            console.log('✅ user_activities 삽입 성공:', data);
          }

          // patent_search_analytics 테이블에도 기록 (IPC/CPC 분석용)
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

            const searchAnalyticsData = {
              user_id: userId,
              search_query: searchKeyword,
              search_type: 'patent_search',
              results_count: resultsCount,
              ipc_codes: [...new Set(ipcCodes)], // 중복 제거
              cpc_codes: [...new Set(cpcCodes)], // 중복 제거
              search_metadata: {
                filters: searchParams,
                total_count: processedData.totalCount,
                page_no: processedData.currentPage,
                page_size: processedData.pageSize,
                timestamp: new Date().toISOString()
              }
            };

            console.log('🔍 [DEBUG] patent_search_analytics 삽입할 데이터:', JSON.stringify(searchAnalyticsData, null, 2));

            const { data: analyticsData, error: analyticsError } = await supabase
              .from('patent_search_analytics')
              .insert(searchAnalyticsData)
              .select();

            if (analyticsError) {
              console.error('❌ patent_search_analytics 삽입 오류:', analyticsError);
            } else {
              console.log('✅ patent_search_analytics 삽입 성공:', analyticsData);
            }
          }
        }
        
        console.log('✅ 검색 기록 저장 완료');
      } catch (historyError) {
        console.warn('⚠️ 검색 기록 저장 실패:', historyError.message);
        console.error('⚠️ 검색 기록 저장 실패 상세:', historyError);
        // 검색 기록 저장 실패는 전체 응답에 영향을 주지 않음
      }
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