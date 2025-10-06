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
    
    // 기본 검색어 처리
    const rawSearchWord = searchParams.word || searchParams.keyword || searchParams.query;
    const searchWord = rawSearchWord ? String(rawSearchWord).trim().replace(/\s+/g, ' ') : '';
    console.log('🔍 [DEBUG] searchWord:', searchWord);
    console.log('🔍 [DEBUG] searchParams:', searchParams);
    
    // 검색어 유효성 검사
    if (!searchWord) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: '검색어가 필요합니다.'
      });
    }
    
    if (searchWord.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameter',
        message: '검색어가 너무 깁니다. 100자 이하로 입력해주세요.'
      });
    }
    
    // KIPRIS OpenAPI 필수 파라미터
    params.append('ServiceKey', kiprisApiKey);
    params.append('word', searchWord);  // 검색어
    
    // 페이지네이션 파라미터
    const requestPageNo = Math.max(1, parseInt(searchParams.pageNo) || 1);
    const requestNumOfRows = Math.min(100, Math.max(1, parseInt(searchParams.numOfRows) || 10));
    params.append('pageNo', requestPageNo.toString());
    params.append('numOfRows', requestNumOfRows.toString());
    
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
    const patents = extractPatentsFromKiprisResponse(kiprisResponse);
    console.log('🔍 ===== extractTotalCountFromKiprisResponse 함수 호출 전 =====');
    console.log('🔍 kiprisResponse 타입:', typeof kiprisResponse);
    console.log('🔍 kiprisResponse 키들:', Object.keys(kiprisResponse || {}));
    const totalCount = extractTotalCountFromKiprisResponse(kiprisResponse);
    console.log('🔍 ===== extractTotalCountFromKiprisResponse 함수 호출 후 =====');
    console.log('🔍 반환된 totalCount:', totalCount);
    
    console.log(`✅ 특허 검색 완료: 총 ${totalCount}건 중 ${patents.length}건 반환`);
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
    
    // 검색 기록 저장
    const userId = req.body.userId;
    if (userId && supabase) {
      try {
        const searchKeyword = processedData.searchQuery;
        const resultsCount = processedData.totalCount;
        
        await supabase
          .from('user_activities')
          .insert({
            user_id: userId,
            activity_type: 'search',
            activity_data: {
              keyword: searchKeyword,
              filters: searchParams,
              results_count: resultsCount,
              total_count: processedData.totalCount,
              timestamp: new Date().toISOString()
            }
          });
        
        console.log('✅ 검색 기록 저장 완료');
      } catch (historyError) {
        console.warn('⚠️ 검색 기록 저장 실패:', historyError.message);
        // 검색 기록 저장 실패는 전체 응답에 영향을 주지 않음
      }
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

    // KIPRIS API 응답에서 특허 아이템 배열 찾기
    let patentItems = [];
    
    if (body.items && Array.isArray(body.items) && body.items.length > 0) {
      const items = body.items[0];
      if (items && items.item && Array.isArray(items.item)) {
        patentItems = items.item;
      } else if (Array.isArray(items)) {
        patentItems = items;
      }
    }

    console.log(`🔍 추출된 특허 아이템 개수: ${patentItems.length}`);

    // 특허 데이터를 표준 형식으로 변환
    const patents = patentItems.map((item, index) => {
      try {
        return {
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
  
  // 다양한 가능한 경로들을 시도
  const possiblePaths = [
    () => kiprisResponse.response.count[0].totalCount[0],
    () => kiprisResponse.response.body[0].count[0].totalCount[0],
    () => kiprisResponse.response.body[0].count.totalCount,
    () => kiprisResponse.response.body[0].totalCount,
    () => kiprisResponse.response.body.count[0].totalCount[0],
    () => kiprisResponse.response.count.totalCount,
    () => kiprisResponse.response.count[0].totalCount,
    () => kiprisResponse.response.count.totalCount[0]
  ];

  let totalCountValue;
  
  for (let i = 0; i < possiblePaths.length; i++) {
    try {
      totalCountValue = possiblePaths[i]();
      if (totalCountValue !== undefined && totalCountValue !== null) {
        console.log(`🎯 [extractTotalCountFromKiprisResponse] 경로 ${i + 1}에서 totalCount 추출 성공: ${totalCountValue}`);
        break;
      }
    } catch (error) {
      // 경로 실패는 정상적인 상황이므로 로그 레벨을 낮춤
      console.debug(`[extractTotalCountFromKiprisResponse] 경로 ${i + 1} 시도 실패: ${error.message}`);
    }
  }

  if (totalCountValue === undefined || totalCountValue === null) {
    console.log('❌ [extractTotalCountFromKiprisResponse] 모든 경로에서 totalCount 추출 실패');
    return 0;
  }

  // 문자열인 경우 숫자로 변환
  const totalCount = parseInt(totalCountValue, 10);
  
  console.log(`✅ [extractTotalCountFromKiprisResponse] 최종 totalCount: ${totalCount}`);
  
  return isNaN(totalCount) ? 0 : totalCount;
}

// KIPRIS XML 응답에서 필드 값 안전하게 추출
function getFieldValue(field) {
  if (!field) return '';
  if (typeof field === 'string') return field.trim();
  if (Array.isArray(field) && field.length > 0) return String(field[0]).trim();
  if (typeof field === 'object' && field._) return String(field._).trim();
  return String(field).trim();
}