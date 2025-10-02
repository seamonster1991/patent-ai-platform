// 로컬 KIPRIS API 테스트
const axios = require('axios');
const { parseStringPromise } = require('xml2js');

async function testKiprisDirectly() {
  try {
    console.log('🔍 KIPRIS API 직접 테스트 시작...');
    
    // 환경변수에서 API 키 가져오기 (실제 키가 필요)
    const kiprisApiKey = process.env.KIPRIS_API_KEY || 'YOUR_API_KEY_HERE';
    
    if (!kiprisApiKey || kiprisApiKey === 'YOUR_API_KEY_HERE') {
      console.error('❌ KIPRIS API 키가 설정되지 않았습니다.');
      console.log('환경변수 KIPRIS_API_KEY를 설정해주세요.');
      return;
    }
    
    console.log('🔑 API 키 확인됨');
    
    // KIPRIS API URL
    const kiprisApiUrl = 'http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/getAdvancedSearch';
    
    // 검색 파라미터
    const params = new URLSearchParams();
    params.append('word', '자동차');
    params.append('pageNo', '1');
    params.append('numOfRows', '5');
    params.append('patent', 'true');
    params.append('utility', 'true');
    params.append('sortSpec', 'AD');
    params.append('descSort', 'true');
    params.append('ServiceKey', kiprisApiKey);
    
    const fullUrl = `${kiprisApiUrl}?${params.toString()}`;
    console.log('📡 요청 URL:', fullUrl.replace(kiprisApiKey, '[API_KEY]'));
    
    // KIPRIS API 호출
    const response = await axios.get(fullUrl, {
      timeout: 30000,
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'Patent-AI-Application'
      }
    });
    
    console.log('✅ 응답 상태:', response.status, response.statusText);
    console.log('📄 응답 타입:', response.headers['content-type']);
    
    // XML 응답 확인
    const xmlData = response.data;
    console.log('🔍 XML 응답 (처음 1000자):', xmlData.substring(0, 1000));
    
    // XML을 JSON으로 변환
    const jsonData = await parseStringPromise(xmlData, {
      explicitArray: false,
      ignoreAttrs: false,
      trim: true
    });
    
    console.log('📄 JSON 변환 완료');
    console.log('🎯 변환된 데이터:', JSON.stringify(jsonData, null, 2));
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    if (error.response) {
      console.error('📄 에러 응답:', error.response.data);
      console.error('🔢 상태 코드:', error.response.status);
    }
    if (error.code) {
      console.error('🔧 에러 코드:', error.code);
    }
  }
}

testKiprisDirectly();