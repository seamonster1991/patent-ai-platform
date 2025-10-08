const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const { createClient } = require('@supabase/supabase-js');

// 환경변수 로드
require('dotenv').config();

// Supabase 클라이언트 초기화 (안전한 초기화)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

try {
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ [documents.js] Supabase 클라이언트 초기화 성공');
  } else {
    console.warn('⚠️ [documents.js] Supabase 환경변수 누락:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });
  }
} catch (error) {
  console.error('❌ [documents.js] Supabase 클라이언트 초기화 실패:', error.message);
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

  // GET 요청만 허용
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed',
      message: 'Only GET method is allowed'
    });
  }

  try {
    console.log('=== KIPRIS API 문서 다운로드 요청 시작 ===');
    console.log('Query parameters:', req.query);
    
    // Supabase 연결 상태 확인 (경고만 출력, 계속 진행)
    if (!supabase) {
      console.warn('⚠️ Supabase 연결이 없어 활동 로깅을 건너뜁니다.');
    }

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

    // 출원번호와 문서 타입 파라미터 검증
    const { applicationNumber, documentType = 'publication', userId } = req.query;
    
    if (!applicationNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: 'applicationNumber parameter is required'
      });
    }

    console.log('출원번호:', applicationNumber);
    console.log('문서 타입:', documentType);
    
    // 문서 타입에 따른 API 엔드포인트 결정 - KIPRIS API 문서에 따라 업데이트
    const documentEndpoints = {
      publication: 'getPubFullTextInfoSearch',           // 1. 공개전문PDF
      announcement: 'getAnnounceFullTextInfoSearch',     // 2. 공고전문PDF
      correction: 'getCorrectionAnnouncementInfoSearch', // 3. 정정공고PDF(폐기예정)
      drawing: 'getRepresentativeDrawingInfoSearch',     // 4. 대표도면
      correctionV2: 'getCorrectionAnnouncementV2InfoSearch', // 5. 정정공고PDF_V2
      publicationBooklet: 'getPublicationBookletInfoSearch', // 6. 공개책자
      gazetteBooklet: 'getGazetteBookletInfoSearch',     // 7. 공보책자
      allDocuments: 'getAllDocumentsInfoSearch',         // 8. 모든 전문 및 대표도 유무
      fullTextInfo: 'getFullTextFileInfoSearch',         // 9. 전문파일정보
      standardPublication: 'getStandardPubFullTextInfoSearch', // 10. 표준화 공개전문PDF
      standardAnnouncement: 'getStandardAnnounceFullTextInfoSearch' // 11. 표준화 공고전문PDF
    };

    const endpoint = documentEndpoints[documentType];
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document type',
        message: `Supported document types: ${Object.keys(documentEndpoints).join(', ')}`
      });
    }
    
    // KIPRIS API URL 구성 - 올바른 서비스 URL 사용
    const kiprisApiUrl = `http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/${endpoint}`;
    
    // 검색 파라미터 준비
    const params = new URLSearchParams();
    params.append('applicationNumber', applicationNumber);
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
    
    // KIPRIS 응답 구조 파싱 - 문서에 따른 구조로 업데이트
    let kiprisResponse = {
      success: false,
      header: {
        successYN: 'N',
        resultCode: '99',
        resultMsg: 'Unknown error'
      },
      data: {
        documentType: documentType,
        files: []
      }
    };
    
    console.log('🔍 JSON 변환된 응답 구조:', JSON.stringify(jsonData, null, 2));
    
    // 실제 응답 데이터 처리
    if (jsonData && jsonData.response) {
      const responseData = jsonData.response;
      
      // 헤더 정보 처리
      if (responseData.header) {
        kiprisResponse.header = {
          successYN: responseData.header.successYN || 'N',
          resultCode: responseData.header.resultCode || '99',
          resultMsg: responseData.header.resultMsg || 'Unknown error',
          requestMsgID: responseData.header.requestMsgID || '',
          responseTime: responseData.header.responseTime || '',
          responseMsgID: responseData.header.responseMsgID || ''
        };
        
        // 성공 여부 판단 - KIPRIS 문서에 따라 resultCode '00'이 성공
        kiprisResponse.success = responseData.header.resultCode === '00';
        
        console.log('📋 헤더 정보:', kiprisResponse.header);
      }
      
      // 바디 데이터 처리 - KIPRIS 문서 구조에 맞게 수정
      if (responseData.body) {
        let itemData = null;
        
        // 다양한 구조 패턴 확인
        if (responseData.body.item) {
          itemData = responseData.body.item;
        } else if (responseData.body.Item) {
          itemData = responseData.body.Item;
        }
        
        if (itemData) {
          // 단일 아이템인 경우 배열로 변환
          const items = Array.isArray(itemData) ? itemData : [itemData];
          
          kiprisResponse.data.files = items.map(item => {
            const file = {
              docName: item.docName || item.DocName || '',
              path: item.path || item.Path || '',
              downloadUrl: item.path || item.Path || ''
            };
            
            console.log('📄 파일 정보:', file);
            return file;
          });
          
          console.log(`📁 총 ${kiprisResponse.data.files.length}개 파일 발견`);
        } else {
          console.log('⚠️ body에서 item 데이터를 찾을 수 없습니다.');
        }
      } else {
        console.log('⚠️ 응답에서 body를 찾을 수 없습니다.');
      }
    } else {
      console.log('⚠️ 응답에서 response를 찾을 수 없습니다.');
    }
    
    // 활동 로깅: 문서 다운로드
    if (userId && supabase) {
      try {
        await supabase.from('user_activities').insert({
          user_id: userId,
          activity_type: 'document_download',
          activity_data: {
            application_number: applicationNumber,
            document_type: documentType,
            files_count: (kiprisResponse?.data?.files || []).length,
            files: (kiprisResponse?.data?.files || []).map(f => ({ name: f.docName, path: f.path })),
            timestamp: new Date().toISOString()
          }
        });
        console.log('✅ 사용자 활동 로깅: document_download');
      } catch (logErr) {
        console.error('❌ 사용자 활동 로깅 실패(document_download):', logErr);
      }
    }

    // 응답 반환
    console.log('✅ 문서 다운로드 정보 반환 완료');
    return res.status(200).json(kiprisResponse);
    
  } catch (error) {
    console.error('❌ KIPRIS API 문서 다운로드 오류:', error);
    
    // Axios 에러 처리
    if (error.response) {
      console.error('API 응답 오류:', error.response.status, error.response.statusText);
      console.error('응답 데이터:', error.response.data);
      
      return res.status(error.response.status).json({
        success: false,
        error: 'KIPRIS API error',
        message: `API returned ${error.response.status}: ${error.response.statusText}`,
        details: error.response.data
      });
    } else if (error.request) {
      console.error('네트워크 오류:', error.message);
      
      return res.status(503).json({
        success: false,
        error: 'Network error',
        message: 'Failed to connect to KIPRIS API',
        details: error.message
      });
    } else {
      console.error('일반 오류:', error.message);
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
};