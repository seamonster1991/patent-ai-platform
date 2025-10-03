const axios = require('axios');

async function testSearchAPI() {
  try {
    console.log('=== 검색 API 테스트 시작 ===');
    
    const searchParams = {
      word: 'AI',
      pageNo: 1,
      numOfRows: 500
    };
    
    console.log('검색 파라미터:', searchParams);
    
    const response = await axios.post('http://localhost:3001/api/search', searchParams, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('✅ API 응답 상태:', response.status);
    console.log('📄 API 응답 데이터:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data) {
      const kiprisData = response.data.data;
      console.log('\n🔍 KIPRIS 응답 분석:');
      console.log('- Header Success:', kiprisData.header?.successYN);
      console.log('- Result Code:', kiprisData.header?.resultCode);
      console.log('- Result Message:', kiprisData.header?.resultMsg);
      console.log('- Items Count:', kiprisData.body?.items?.length || 0);
      console.log('- Total Count:', kiprisData.body?.count?.totalCount || 0);
      console.log('- Page No:', kiprisData.body?.count?.pageNo || 0);
      console.log('- Num of Rows:', kiprisData.body?.count?.numOfRows || 0);
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
  }
}

// 테스트 실행
testSearchAPI();