const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
  }
}

// 사용자 활동 로깅 함수
async function logUserActivity(searchParams, results) {
  if (!supabase) {
    console.log('Supabase not configured, skipping activity log');
    return;
  }

  try {
    const { error } = await supabase
      .from('user_activities')
      .insert([
        {
          activity_type: 'patent_search',
          search_params: searchParams,
          result_count: results?.length || 0,
          timestamp: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Failed to log user activity:', error);
    }
  } catch (error) {
    console.error('Error logging user activity:', error);
  }
}

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
    console.log('Environment variables check:');
    console.log('- KIPRIS_API_KEY:', process.env.KIPRIS_API_KEY ? 'Set' : 'Not set');
    console.log('- KIPRIS_SERVICE_KEY:', process.env.KIPRIS_SERVICE_KEY ? 'Set' : 'Not set');

    // 환경변수에서 KIPRIS API 키 가져오기
    const kiprisApiKey = process.env.KIPRIS_API_KEY || process.env.KIPRIS_SERVICE_KEY;
    
    if (!kiprisApiKey) {
      console.error('KIPRIS API key not found in environment variables');
      return res.status(500).json({
        success: false,
        error: 'API configuration error',
        message: 'KIPRIS API key is not configured',
        debug: {
          hasApiKey: !!process.env.KIPRIS_API_KEY,
          hasServiceKey: !!process.env.KIPRIS_SERVICE_KEY
        }
      });
    }

    console.log('KIPRIS API Key found:', kiprisApiKey ? 'Yes' : 'No');

    // 사용자 활동 로깅 (비동기로 처리하여 메인 로직에 영향 없도록)
    logUserActivity(req.body, []).catch(error => {
      console.error('Activity logging failed:', error);
    });
    
    const searchParams = req.body;
    
    console.log('🔍 KIPRIS API 검색 요청:', {
      searchParams: JSON.stringify(searchParams, null, 2),
      serviceKeyExists: !!kiprisApiKey,
      serviceKeyLength: kiprisApiKey.length,
      envVars: {
        KIPRIS_SERVICE_KEY: !!process.env.KIPRIS_SERVICE_KEY,
        KIPRIS_API_KEY: !!process.env.KIPRIS_API_KEY,
        NODE_ENV: process.env.NODE_ENV
      }
    });
    
    // KIPRIS API URL
    const kiprisApiUrl = 'http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getAdvancedSearch';
    
    // 검색 파라미터 준비
    const params = new URLSearchParams();
    
    // 기본 검색 필드 - keyword를 word로 변환 (호환성)
    const searchWord = searchParams.word || searchParams.keyword;
    if (searchWord) params.append('word', searchWord);
    if (searchParams.inventionTitle) params.append('inventionTitle', searchParams.inventionTitle);
    if (searchParams.astrtCont) params.append('astrtCont', searchParams.astrtCont);
    if (searchParams.claimScope) params.append('claimScope', searchParams.claimScope);
    if (searchParams.ipcNumber) params.append('ipcNumber', searchParams.ipcNumber);
    
    // 번호 검색
    if (searchParams.applicationNumber) params.append('applicationNumber', searchParams.applicationNumber);
    if (searchParams.openNumber) params.append('openNumber', searchParams.openNumber);
    if (searchParams.publicationNumber) params.append('publicationNumber', searchParams.publicationNumber);
    if (searchParams.registerNumber) params.append('registerNumber', searchParams.registerNumber);
    if (searchParams.priorityApplicationNumber) params.append('priorityApplicationNumber', searchParams.priorityApplicationNumber);
    if (searchParams.internationalApplicationNumber) params.append('internationalApplicationNumber', searchParams.internationalApplicationNumber);
    if (searchParams.internationOpenNumber) params.append('internationOpenNumber', searchParams.internationOpenNumber);
    
    // 날짜 검색
    if (searchParams.applicationDate) params.append('applicationDate', searchParams.applicationDate);
    if (searchParams.openDate) params.append('openDate', searchParams.openDate);
    if (searchParams.publicationDate) params.append('publicationDate', searchParams.publicationDate);
    if (searchParams.registerDate) params.append('registerDate', searchParams.registerDate);
    if (searchParams.priorityApplicationDate) params.append('priorityApplicationDate', searchParams.priorityApplicationDate);
    if (searchParams.internationalApplicationDate) params.append('internationalApplicationDate', searchParams.internationalApplicationDate);
    if (searchParams.internationOpenDate) params.append('internationOpenDate', searchParams.internationOpenDate);
    
    // 인물 정보
    if (searchParams.applicant) params.append('applicant', searchParams.applicant);
    if (searchParams.inventors) params.append('inventors', searchParams.inventors);
    if (searchParams.agent) params.append('agent', searchParams.agent);
    if (searchParams.rightHoler) params.append('rightHoler', searchParams.rightHoler);
    
    // 특허 유형
    if (searchParams.patent !== undefined) params.append('patent', searchParams.patent.toString());
    if (searchParams.utility !== undefined) params.append('utility', searchParams.utility.toString());
    
    // 행정처분 상태
    if (searchParams.lastvalue) params.append('lastvalue', searchParams.lastvalue);
    
    // 페이지네이션 및 정렬
    params.append('pageNo', (searchParams.pageNo || 1).toString());
    params.append('numOfRows', (searchParams.numOfRows || 30).toString());
    if (searchParams.sortSpec) params.append('sortSpec', searchParams.sortSpec);
    if (searchParams.descSort !== undefined) params.append('descSort', searchParams.descSort.toString());
    
    // 서비스 키 추가
    params.append('ServiceKey', kiprisApiKey);
    
    const fullUrl = `${kiprisApiUrl}?${params.toString()}`;
    console.log('📡 KIPRIS API 호출 URL:', fullUrl.replace(kiprisApiKey, '[SERVICE_KEY]'));
    
    // KIPRIS API 호출 (재시도 로직 포함)
    let response;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        response = await axios.get(fullUrl, {
          timeout: 30000, // 30초 타임아웃
          headers: {
            'Accept': 'application/xml',
            'User-Agent': 'Patent-AI-Application'
          },
          // 추가 설정으로 연결 안정성 향상
          maxRedirects: 5,
          validateStatus: (status) => status < 500 // 5xx 에러만 재시도
        });
        break; // 성공하면 루프 종료
      } catch (error) {
        retryCount++;
        console.log(`🔄 KIPRIS API 호출 재시도 ${retryCount}/${maxRetries}:`, error.message);
        
        if (retryCount >= maxRetries) {
          throw error; // 최대 재시도 횟수 도달 시 에러 발생
        }
        
        // 재시도 전 잠시 대기 (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    console.log('✅ KIPRIS API 응답 상태:', response.status, response.statusText);
    
    // XML 응답을 JSON으로 변환
    const xmlData = response.data;
    console.log('🔍 원본 XML 응답 (처음 1000자):', xmlData.substring(0, 1000));
    
    const jsonData = await parseStringPromise(xmlData, {
      explicitArray: false,
      ignoreAttrs: true,
      trim: true
    });
    
    console.log('🔄 JSON 변환 완료. 전체 구조:', JSON.stringify(jsonData, null, 2));
    
    // KIPRIS API 응답 구조 확인 및 변환
    let kiprisResponse;
    if (jsonData.response) {
      kiprisResponse = {
        header: jsonData.response.header || {},
        body: {
          items: [],
          count: {
            numOfRows: 0,
            pageNo: 1,
            totalCount: 0
          }
        }
      };
      
      // items 처리
      if (jsonData.response.body && jsonData.response.body.items) {
        const items = jsonData.response.body.items.item;
        if (Array.isArray(items)) {
          kiprisResponse.body.items = items;
        } else if (items) {
          kiprisResponse.body.items = [items];
        }
      }
      
      // count 정보 처리 (totalCount 포함) - 올바른 경로: response.count
      if (jsonData.response.count) {
        console.log('📊 count 추출 시도 (response.count):', jsonData.response.count);
        
        kiprisResponse.body.count = {
          numOfRows: parseInt(jsonData.response.count.numOfRows) || parseInt(searchParams.numOfRows) || 30,
          pageNo: parseInt(jsonData.response.count.pageNo) || parseInt(searchParams.pageNo) || 1,
          totalCount: parseInt(jsonData.response.count.totalCount) || 0
        };
        
        console.log('📊 totalCount 추출:', {
          raw: jsonData.response.count.totalCount,
          parsed: parseInt(jsonData.response.count.totalCount),
          type: typeof jsonData.response.count.totalCount
        });
        console.log('✅ 최종 kiprisResponse.body.count:', kiprisResponse.body.count);
      } else {
        console.log('⚠️ response.count가 없음, 기본값 사용');
        kiprisResponse.body.count = {
          numOfRows: parseInt(searchParams.numOfRows) || 30,
          pageNo: parseInt(searchParams.pageNo) || 1,
          totalCount: kiprisResponse.body.items.length // items 길이로 추정
        };
      }
    } else {
      // 응답 구조가 예상과 다른 경우 기본 구조 반환
      kiprisResponse = {
        header: {
          successYN: 'N',
          resultCode: '99',
          resultMsg: '응답 형식 오류'
        },
        body: {
          items: [],
          count: {
            numOfRows: 0,
            pageNo: 1,
            totalCount: 0
          }
        }
      };
    }
    
    console.log('📤 KIPRIS API 최종 응답:', {
      success: kiprisResponse.header.successYN === 'Y',
      itemCount: kiprisResponse.body.items.length,
      totalCount: kiprisResponse.body.count.totalCount,
      resultCode: kiprisResponse.header.resultCode,
      resultMsg: kiprisResponse.header.resultMsg
    });
    
    res.json({
      success: true,
      data: kiprisResponse
    });
    
  } catch (error) {
    console.error('❌ KIPRIS API Error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url?.replace(kiprisApiKey || '', '[SERVICE_KEY]'),
        method: error.config?.method,
        timeout: error.config?.timeout
      }
    });
    
    // 에러 타입에 따른 메시지 처리
    let errorMessage = 'KIPRIS API 호출 중 오류가 발생했습니다.';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'KIPRIS API 응답 시간이 초과되었습니다.';
      errorCode = 'TIMEOUT_ERROR';
    } else if (error.response) {
      errorMessage = `KIPRIS API 오류: ${error.response.status} ${error.response.statusText}`;
      errorCode = 'API_RESPONSE_ERROR';
    } else if (error.request) {
      errorMessage = 'KIPRIS API 서버에 연결할 수 없습니다.';
      errorCode = 'CONNECTION_ERROR';
    } else if (error.message.includes('XML')) {
      errorMessage = 'KIPRIS API 응답 데이터 처리 중 오류가 발생했습니다.';
      errorCode = 'XML_PARSE_ERROR';
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      errorCode: errorCode,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        config: error.config
      } : undefined
    });
  }
}