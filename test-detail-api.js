const axios = require('axios');

async function testDetailAPI() {
  try {
    console.log('🔍 KIPRIS API 상세보기 테스트 시작...');
    
    // 테스트할 출원번호 (이전에 검색에서 확인된 번호)
    const applicationNumber = '1020050050026';
    
    // 새로운 Vercel 배포 서버 URL
    const vercelUrl = `https://p-2i2heb990-re-chip.vercel.app/api/patents/detail?applicationNumber=${applicationNumber}`;
    
    console.log(`📡 요청 URL: ${vercelUrl}`);
    console.log(`📋 출원번호: ${applicationNumber}`);
    
    const response = await axios.get(vercelUrl, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 응답 상태:', response.status, response.statusText);
    
    const data = response.data;
    
    // HTML 응답인지 확인
    if (typeof data === 'string' && data.includes('<!doctype html>')) {
      console.log('❌ HTML 페이지가 반환되었습니다. API 엔드포인트가 존재하지 않습니다.');
      return;
    }
    
    console.log('📄 전체 응답 데이터:', JSON.stringify(data, null, 2));
    
    if (data && data.success) {
      console.log('🎯 API 호출 성공!');
      console.log('📊 응답 구조:');
      console.log('- Header:', data.data.header);
      
      const item = data.data.body.item;
      
      // 서지상세정보
      if (item.biblioSummaryInfo) {
        console.log('\n📋 서지상세정보:');
        console.log('- 발명의 명칭:', item.biblioSummaryInfo.inventionTitle);
        console.log('- 출원번호:', item.biblioSummaryInfo.applicationNumber);
        console.log('- 출원일자:', item.biblioSummaryInfo.applicationDate);
        console.log('- 등록번호:', item.biblioSummaryInfo.registerNumber);
        console.log('- 등록상태:', item.biblioSummaryInfo.registerStatus);
      }
      
      // IPC 정보
      if (item.ipcInfo && item.ipcInfo.length > 0) {
        console.log('\n🏷️ IPC 정보:');
        item.ipcInfo.forEach((ipc, index) => {
          console.log(`- IPC ${index + 1}: ${ipc.ipcNumber} (${ipc.ipcDate})`);
        });
      }
      
      // 출원인 정보
      if (item.applicantInfo && item.applicantInfo.length > 0) {
        console.log('\n👤 출원인 정보:');
        item.applicantInfo.forEach((applicant, index) => {
          console.log(`- 출원인 ${index + 1}: ${applicant.name} (${applicant.country})`);
        });
      }
      
      // 발명자 정보
      if (item.inventorInfo && item.inventorInfo.length > 0) {
        console.log('\n🧑‍🔬 발명자 정보:');
        item.inventorInfo.forEach((inventor, index) => {
          console.log(`- 발명자 ${index + 1}: ${inventor.name} (${inventor.country})`);
        });
      }
      
      // 초록 정보
      if (item.abstractInfo && item.abstractInfo.astrtCont) {
        console.log('\n📝 초록:');
        console.log(item.abstractInfo.astrtCont.substring(0, 200) + '...');
      }
      
      // 청구항 정보
      if (item.claimInfo && item.claimInfo.length > 0) {
        console.log('\n⚖️ 청구항 정보:');
        console.log(`- 총 ${item.claimInfo.length}개의 청구항`);
        if (item.claimInfo[0] && item.claimInfo[0].claim) {
          console.log('- 첫 번째 청구항:', item.claimInfo[0].claim.substring(0, 100) + '...');
        }
      }
      
    } else {
      console.log('❌ API 호출 실패:', data ? data.message : '응답 데이터가 없습니다');
      console.log('응답 데이터 구조:', data);
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
testDetailAPI();