const axios = require('axios');

async function testKiprisAPI() {
  try {
    console.log('🔍 KIPRIS API 테스트 시작...');
    
    const testData = {
      word: "자동차",
      pageNo: 1,
      numOfRows: 5
    };
    
    console.log('📤 요청 데이터:', testData);
    
    const response = await axios.post(
      'https://p-1d2qyv7ph-re-chip.vercel.app/api/kipris-search',
      testData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('✅ 응답 상태:', response.status);
    console.log('📄 응답 데이터:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('🎯 검색 성공!');
      console.log('📊 결과 개수:', response.data.data?.body?.items?.length || 0);
      console.log('📈 전체 개수:', response.data.data?.body?.count?.totalCount || 0);
      
      // 첫 번째 결과 출력
      if (response.data.data?.body?.items?.length > 0) {
        const firstItem = response.data.data.body.items[0];
        console.log('🔍 첫 번째 검색 결과:');
        console.log('  - 발명명칭:', firstItem.inventionTitle);
        console.log('  - 출원번호:', firstItem.applicationNumber);
        console.log('  - 출원일자:', firstItem.applicationDate);
        console.log('  - 등록상태:', firstItem.registerStatus);
      }
    } else {
      console.log('❌ 검색 실패:', response.data.error);
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    if (error.response) {
      console.error('📄 에러 응답:', error.response.data);
      console.error('🔢 상태 코드:', error.response.status);
    }
  }
}

testKiprisAPI();