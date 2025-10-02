const axios = require('axios');
const { parseStringPromise } = require('xml2js');

module.exports = async function handler(req, res) {
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
    
    const searchParams = req.body;
    
    console.log('🔍 KIPRIS API 검색 요청:', {
      searchParams: JSON.stringify(searchParams, null, 2),
      serviceKeyExists: !!kiprisApiKey,
      serviceKeyLength: kiprisApiKey.length
    });
    
    // KIPRIS API URL
    const kiprisApiUrl = 'http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getAdvancedSearch';
    
    // 검색 파라미터 준비
    const params = new URLSearchParams();
    
    // 기본 검색 필드
    const searchWord = searchParams.word || searchParams.keyword;
    if (searchWord) params.append('word', searchWord);
    
    // 페이지네이션
    params.append('pageNo', (searchParams.pageNo || 1).toString());
    params.append('numOfRows', (searchParams.numOfRows || 30).toString());
    
    // 서비스 키 추가
    params.append('ServiceKey', kiprisApiKey);
    
    const fullUrl = `${kiprisApiUrl}?${params.toString()}`;
    console.log('📡 KIPRIS API 호출 URL:', fullUrl.replace(kiprisApiKey, '[SERVICE_KEY]'));
    
    // KIPRIS API 호출
    const response = await axios.get(fullUrl, {
      timeout: 30000,
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'Patent-AI-Application'
      }
    });
    
    console.log('✅ KIPRIS API 응답 상태:', response.status, response.statusText);
    
    // XML 응답을 JSON으로 변환
    const xmlData = response.data;
    console.log('🔍 원본 XML 응답 (처음 500자):', xmlData.substring(0, 500));
    
    const jsonData = await parseStringPromise(xmlData, {
      explicitArray: false,
      ignoreAttrs: false,
      trim: true
    });
    
    console.log('📄 JSON 변환 완료');
    
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
          totalCount: 0
        }
      }
    };
    
    // 실제 응답 데이터 처리
    if (jsonData && jsonData.response) {
      const responseData = jsonData.response;
      
      if (responseData.header) {
        kiprisResponse.header = {
          successYN: responseData.header.successYN || 'Y',
          resultCode: responseData.header.resultCode || '00',
          resultMsg: responseData.header.resultMsg || 'NORMAL_SERVICE'
        };
      }
      
      if (responseData.body) {
        const bodyData = responseData.body;
        
        // items 처리
        if (bodyData.items && bodyData.items.item) {
          const items = Array.isArray(bodyData.items.item) ? bodyData.items.item : [bodyData.items.item];
          kiprisResponse.body.items = items;
        }
        
        // count 처리
        if (bodyData.count) {
          kiprisResponse.body.count = {
            totalCount: parseInt(bodyData.count.totalCount || bodyData.count || 0)
          };
        }
      }
    }
    
    console.log('🎯 최종 KIPRIS API 응답:', {
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
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
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
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      errorCode: errorCode
    });
  }
};