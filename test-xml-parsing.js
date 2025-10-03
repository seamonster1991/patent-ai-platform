const { parseStringPromise } = require('xml2js');

// 사용자가 제공한 XML 구조 시뮬레이션
const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <header>
    <successYN>Y</successYN>
    <resultCode>00</resultCode>
    <resultMsg>NORMAL_SERVICE</resultMsg>
  </header>
  <body>
    <count>
      <totalCount>95415</totalCount>
      <pageNo>1</pageNo>
      <numOfRows>30</numOfRows>
    </count>
    <items>
      <item>
        <indexNo>1</indexNo>
        <inventionTitle>인공지능 테스트</inventionTitle>
      </item>
    </items>
  </body>
</response>`;

async function testXMLParsing() {
  console.log('=== XML 파싱 테스트 ===');
  console.log('원본 XML:', sampleXML);
  
  try {
    // XML을 JSON으로 변환
    const jsonData = await parseStringPromise(sampleXML, {
      explicitArray: false,
      ignoreAttrs: true,
      trim: true,
      mergeAttrs: true
    });
    
    console.log('\n=== 파싱된 JSON ===');
    console.log(JSON.stringify(jsonData, null, 2));
    
    // count 정보 추출
    if (jsonData && jsonData.response && jsonData.response.body) {
      const bodyData = jsonData.response.body;
      console.log('\n=== bodyData.count ===');
      console.log(JSON.stringify(bodyData.count, null, 2));
      
      if (bodyData.count && bodyData.count.totalCount) {
        const totalCount = parseInt(bodyData.count.totalCount);
        console.log('\n=== 추출된 totalCount ===');
        console.log('totalCount:', totalCount);
        console.log('타입:', typeof totalCount);
        
        // 페이지 계산
        const numOfRows = 30;
        const totalPages = Math.ceil(totalCount / numOfRows);
        console.log('numOfRows:', numOfRows);
        console.log('totalPages:', totalPages);
      }
    }
    
  } catch (error) {
    console.error('XML 파싱 오류:', error);
  }
}

testXMLParsing();