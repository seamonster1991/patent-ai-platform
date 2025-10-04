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

    // 환경변수에서 KIPRIS API 키 가져오기
    const kiprisApiKey = process.env.KIPRIS_API_KEY;
    
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
    
    // KIPRIS API URL (문서에 따른 올바른 엔드포인트)
    const kiprisApiUrl = 'http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getAdvancedSearch';
    
    // 검색 파라미터 준비 (KIPRIS API 문서 스펙에 따라)
    const params = new URLSearchParams();
    
    // 기본 검색 필드 매핑 (다양한 필드명 지원)
    const rawSearchWord = searchParams.word || searchParams.keyword || searchParams.query;
    const searchWord = rawSearchWord ? String(rawSearchWord).trim().replace(/\s+/g, ' ') : '';
    console.log('🔍 [DEBUG] searchWord:', searchWord);
    console.log('🔍 [DEBUG] searchParams:', searchParams);
    
    // 검색어 유효성 검사 및 길이 제한
    if (searchWord) {
      if (searchWord.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Invalid parameter',
          message: '검색어가 너무 깁니다. 100자 이하로 입력해주세요.'
        });
      }
      // 자유검색으로 처리
      params.append('word', searchWord);
      console.log('🔍 [DEBUG] word 파라미터 추가됨:', searchWord);
    }
    
    // 최소 하나의 검색 조건이 있어야 함
    const hasAnyFilter = !!(searchWord || searchParams.inventionTitle || searchParams.astrtCont || searchParams.claimScope || searchParams.ipcNumber || searchParams.applicationNumber || searchParams.applicant || searchParams.inventors);
    if (!hasAnyFilter) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: '검색어 또는 검색 필터가 최소 1개 이상 필요합니다.'
      });
    }
    
    // 발명의명칭 검색
    if (searchParams.inventionTitle) {
      params.append('inventionTitle', searchParams.inventionTitle);
    }
    
    // 초록 검색
    if (searchParams.astrtCont) {
      params.append('astrtCont', searchParams.astrtCont);
    }
    
    // 청구범위 검색
    if (searchParams.claimScope) {
      params.append('claimScope', searchParams.claimScope);
    }
    
    // IPC 코드
    if (searchParams.ipcNumber) {
      params.append('ipcNumber', searchParams.ipcNumber);
    }
    
    // 출원번호
    if (searchParams.applicationNumber) {
      params.append('applicationNumber', searchParams.applicationNumber);
    }
    
    // 출원인 정보
    if (searchParams.applicant) {
      params.append('applicant', searchParams.applicant);
    }
    
    // 발명자 정보
    if (searchParams.inventors) {
      params.append('inventors', searchParams.inventors);
    }
    
    // 특허/실용신안 구분
    if (searchParams.patent !== undefined) {
      params.append('patent', searchParams.patent.toString());
    } else {
      params.append('patent', 'true'); // 기본값: 특허 포함
    }
    
    if (searchParams.utility !== undefined) {
      params.append('utility', searchParams.utility.toString());
    } else {
      params.append('utility', 'true'); // 기본값: 실용신안 포함
    }
    
    // 페이지네이션
    params.append('pageNo', (searchParams.pageNo || 1).toString());
    // 서버 안정성을 위해 한 페이지 최대 100개로 제한 (환경변수로 조정 가능)
    const MAX_ROWS = Number(process.env.KIPRIS_MAX_ROWS) || 100;
    const requestedRows = Number(searchParams.numOfRows || 30);
    params.append('numOfRows', Math.min(requestedRows, MAX_ROWS).toString());
    
    // 정렬 기준 (기본: 출원일자 내림차순)
    params.append('sortSpec', searchParams.sortSpec || 'AD');
    params.append('descSort', searchParams.descSort !== undefined ? searchParams.descSort.toString() : 'true');
    
    // 서비스 키 추가
    params.append('ServiceKey', kiprisApiKey);
    
    const fullUrl = `${kiprisApiUrl}?${params.toString()}`;
    console.log('📡 KIPRIS API 호출 URL:', fullUrl.replace(kiprisApiKey, '[SERVICE_KEY]'));
    
    // KIPRIS API 호출
    const response = await axios.get(fullUrl, {
      timeout: TIMEOUT_MS,
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'Patent-AI-Application'
      }
    });
    
    console.log('✅ KIPRIS API 응답 상태:', response.status, response.statusText);
    
    // XML 응답을 JSON으로 변환
    const xmlData = response.data;
    console.log('🔍 원본 XML 응답 (처음 1000자):', xmlData.substring(0, 1000));
    
    // XML을 JSON으로 변환
    console.log('🔄 XML을 JSON으로 변환 중...');
    let jsonData;
    try {
      jsonData = await parseStringPromise(xmlData, {
        explicitArray: false,
        ignoreAttrs: true,
        trim: true,
        mergeAttrs: true
      });
    } catch (parseErr) {
      console.error('❌ XML 파싱 오류:', parseErr?.message || parseErr);
      return res.status(502).json({
        success: false,
        error: 'PARSE_ERROR',
        message: 'KIPRIS 응답을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      });
    }
    
    console.log('🔍 [DEBUG] 전체 JSON 데이터:', JSON.stringify(jsonData, null, 2));
    console.log('📄 JSON 변환 완료');
    console.log('🔍 [API] JSON 변환 결과 전체 구조:', JSON.stringify(jsonData, null, 2));
    
    // KIPRIS 응답 구조 파싱
    const kiprisResponse = {
      header: {
        successYN: 'Y',
        resultCode: '00',
        resultMsg: 'NORMAL_SERVICE'
      },
      body: {
        items: [],
        count: {
          totalCount: 0,
          pageNo: parseInt(searchParams.pageNo || 1),
          numOfRows: parseInt(searchParams.numOfRows || 30)
        }
      }
    };
    
    // 실제 응답 데이터 처리
    if (jsonData && jsonData.response) {
      const responseData = jsonData.response;
      
      console.log('🔍 [API] responseData 전체 구조:', JSON.stringify(responseData, null, 2));
      
      // 헤더 정보 처리
      if (responseData.header) {
        kiprisResponse.header = {
          successYN: responseData.header.successYN || 'Y',
          resultCode: responseData.header.resultCode || '00',
          resultMsg: responseData.header.resultMsg || 'NORMAL_SERVICE'
        };
        console.log('🔍 [API] 헤더 정보:', kiprisResponse.header);
      }
      
      // 바디 데이터 처리
      if (responseData.body) {
        const bodyData = responseData.body;
        console.log('🔍 [API] bodyData 전체 구조:', JSON.stringify(bodyData, null, 2));
        
        // items 처리
        if (bodyData.items) {
          console.log('🔍 [API] bodyData.items 구조:', JSON.stringify(bodyData.items, null, 2));
          
          if (bodyData.items.item) {
            const items = Array.isArray(bodyData.items.item) ? bodyData.items.item : [bodyData.items.item];
            kiprisResponse.body.items = items.map(item => ({
              indexNo: item.indexNo,
              registerStatus: item.registerStatus,
              inventionTitle: item.inventionTitle,
              ipcNumber: item.ipcNumber,
              registerNumber: item.registerNumber,
              registerDate: item.registerDate,
              applicationNumber: item.applicationNumber,
              applicationDate: item.applicationDate,
              openNumber: item.openNumber,
              openDate: item.openDate,
              publicationNumber: item.publicationNumber,
              publicationDate: item.publicationDate,
              astrtCont: item.astrtCont,
              drawing: item.drawing,
              bigDrawing: item.bigDrawing,
              applicantName: item.applicantName
            }));
            console.log('🔍 [API] 파싱된 items 개수:', kiprisResponse.body.items.length);
          }
        }
        
        // count 처리 - 간단하게 bodyData.count.totalCount에서 직접 가져오기
        console.log('🔍 [API] count 정보 처리 시작');
        let totalCount = 0;
        let pageNo = parseInt(searchParams.pageNo || 1);
        let numOfRows = parseInt(searchParams.numOfRows || 30);

        if (bodyData.count) {
          console.log('🔍 [API] bodyData.count 발견:', JSON.stringify(bodyData.count, null, 2));
          
          // totalCount 직접 추출 - 여러 방법 시도
          if (bodyData.count.totalCount) {
            totalCount = parseInt(bodyData.count.totalCount) || 0;
            console.log('🔍 [API] bodyData.count.totalCount에서 추출:', totalCount);
          } else if (bodyData.count.count) {
            totalCount = parseInt(bodyData.count.count) || 0;
            console.log('🔍 [API] bodyData.count.count에서 추출:', totalCount);
          } else if (typeof bodyData.count === 'string' || typeof bodyData.count === 'number') {
            totalCount = parseInt(bodyData.count) || 0;
            console.log('🔍 [API] bodyData.count 직접 변환:', totalCount);
          }
          
          // pageNo와 numOfRows도 추출
          if (bodyData.count.pageNo) {
            pageNo = parseInt(bodyData.count.pageNo) || pageNo;
          }
          if (bodyData.count.numOfRows) {
            numOfRows = parseInt(bodyData.count.numOfRows) || numOfRows;
          }
          
          console.log('🔍 [API] 최종 추출된 값들 - totalCount:', totalCount, 'pageNo:', pageNo, 'numOfRows:', numOfRows);
        } else {
          console.warn('⚠️ [API] body.count가 누락되었습니다.');
          
          // XML에서 직접 totalCount 추출 시도
          const totalCountMatch = xmlData.match(/<totalCount>(\d+)<\/totalCount>/);
          if (totalCountMatch) {
            totalCount = parseInt(totalCountMatch[1]) || 0;
            console.log('🔍 [API] XML에서 직접 추출한 totalCount:', totalCount);
          }
        }
        
        kiprisResponse.body.count = {
          totalCount: totalCount,
          pageNo: pageNo,
          numOfRows: numOfRows
        };
        
        console.log('🔍 [API] 최종 파싱된 count:', JSON.stringify(kiprisResponse.body.count, null, 2));
      }
    }
    
    // API 키 검증 실패 처리
    if (kiprisResponse.header.resultCode === '10') {
      console.error('❌ KIPRIS API 키 검증 실패:', kiprisResponse.header.resultMsg);
      return res.status(401).json({
        success: false,
        error: 'API key validation failed',
        message: kiprisResponse.header.resultMsg,
        code: kiprisResponse.header.resultCode
      });
    }
    
    // 기타 API 오류 처리
    if (kiprisResponse.header.successYN !== 'Y' || kiprisResponse.header.resultCode !== '00') {
      console.error('❌ KIPRIS API 오류:', kiprisResponse.header);
      return res.status(400).json({
        success: false,
        error: 'KIPRIS API error',
        message: kiprisResponse.header.resultMsg,
        code: kiprisResponse.header.resultCode
      });
    }
    
    console.log('🎯 최종 KIPRIS API 응답:', {
      success: kiprisResponse.header.successYN === 'Y',
      itemCount: kiprisResponse.body.items.length,
      totalCount: kiprisResponse.body.count.totalCount,
      pageNo: kiprisResponse.body.count.pageNo,
      numOfRows: kiprisResponse.body.count.numOfRows,
      resultCode: kiprisResponse.header.resultCode,
      resultMsg: kiprisResponse.header.resultMsg
    });
    
    // 활동 추적 - 검색 기록
    try {
      const userId = req.body.userId;
      if (userId && supabase) {
        const searchKeyword = searchParams.word || searchParams.keyword || '';
        const resultsCount = kiprisResponse.body.items.length;
        
        await supabase
          .from('user_activities')
          .insert({
            user_id: userId,
            activity_type: 'search',
            activity_data: {
              keyword: searchKeyword,
              filters: searchParams,
              results_count: resultsCount,
              total_count: kiprisResponse.body.count.totalCount,
              timestamp: new Date().toISOString()
            }
          });
        
        console.log('✅ 검색 활동 추적 완료:', { userId, keyword: searchKeyword, resultsCount });
      }
    } catch (activityError) {
      console.error('❌ 검색 활동 추적 오류:', activityError);
      // 활동 추적 실패는 검색 기능에 영향을 주지 않음
    }
    
    return res.status(200).json({
      success: true,
      data: kiprisResponse
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