// 관리자 API 테스트 스크립트
import fetch from 'node-fetch';

async function testAdminLogin() {
  try {
    console.log('관리자 로그인 API 테스트 시작...');
    
    const response = await fetch('http://localhost:3001/api/admin?action=auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@patent-ai.com',
        password: 'admin123'
      })
    });
    
    console.log('응답 상태:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('응답 데이터:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ 관리자 로그인 성공!');
    } else {
      console.log('❌ 관리자 로그인 실패:', data.error);
    }
    
  } catch (error) {
    console.error('❌ API 테스트 오류:', error.message);
  }
}

testAdminLogin();