const { VercelRequest, VercelResponse } = require('@vercel/node');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Activity logging function
async function logUserActivity(userId: string, activityType: string, details: any, req: VercelRequest) {
  try {
    const { error } = await supabase
      .from('user_activities')
      .insert({
        user_id: userId,
        activity_type: activityType,
        details: details,
        ip_address: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown'
      });

    if (error) {
      console.error('Error logging user activity:', error);
    }
  } catch (error) {
    console.error('Error in logUserActivity:', error);
  }
}

module.exports = async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('API handler called with method:', req.method);
  console.log('Environment variables check:', {
    hasKiprisKey: !!process.env.KIPRIS_API_KEY,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    console.log('Request body:', req.body);
    const searchParams = req.body;
    
    // Log KIPRIS search activity
    const userId = req.headers.authorization?.replace('Bearer ', '') || 'anonymous';
    if (userId !== 'anonymous') {
      await logUserActivity(userId, 'SEARCH', {
        searchType: 'kipris',
        searchParams: searchParams,
        keyword: searchParams.word || searchParams.keyword,
        inventionTitle: searchParams.inventionTitle,
        applicationNumber: searchParams.applicationNumber
      }, req);
    }
    
    // KIPRIS API 서비스 키 (환경변수에서 가져오기)
    const serviceKey = process.env.KIPRIS_SERVICE_KEY || process.env.KIPRIS_API_KEY || 'your_service_key_here';
    
    // 환경변수 검증
    if (!serviceKey || serviceKey === 'your_service_key_here') {
      console.error('❌ KIPRIS API 키가 설정되지 않았습니다.');
      return res.status(500).json({
        success: false,
        message: 'KIPRIS API 키가 설정되지 않았습니다. 관리자에게 문의하세요.',
        error: 'KIPRIS_API_KEY not configured'
      });
    }
    
    console.log('🔍 KIPRIS API 검색 요청:', {
      searchParams: JSON.stringify(searchParams, null, 2),
      serviceKeyExists: serviceKey !== 'your_service_key_here',
      serviceKeyLength: serviceKey.length,
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
    params.append('ServiceKey', serviceKey);
    
    const fullUrl = `${kiprisApiUrl}?${params.toString()}`;
    console.log('📡 KIPRIS API 호출 URL:', fullUrl.replace(serviceKey, '[SERVICE_KEY]'));
    
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
      } catch (error: any) {
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
    
  } catch (error: any) {
    console.error('KIPRIS API Error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // 에러 타입에 따른 메시지 처리
    let errorMessage = 'KIPRIS API 호출 중 오류가 발생했습니다.';
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'KIPRIS API 응답 시간이 초과되었습니다.';
    } else if (error.response) {
      errorMessage = `KIPRIS API 오류: ${error.response.status} ${error.response.statusText}`;
    } else if (error.request) {
      errorMessage = 'KIPRIS API 서버에 연결할 수 없습니다.';
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}