// 브라우저 콘솔에서 실행할 관리자 로그인 테스트
console.log('=== 관리자 로그인 테스트 시작 ===');

// 관리자 API 서비스 직접 테스트
fetch('http://localhost:8000/api/v1/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email: 'admin@p-ai.co.kr',
        password: 'admin123'
    })
}).then(response => {
    console.log('API 응답 상태:', response.status);
    return response.json();
}).then(data => {
    console.log('API 응답 데이터:', data);
    
    // 토큰을 로컬 스토리지에 저장
    if (data.access_token) {
        localStorage.setItem('admin_token', data.access_token);
        localStorage.setItem('admin_refresh_token', data.refresh_token);
        console.log('토큰 저장 완료');
        
        // 관리자 대시보드로 이동
        window.location.href = '/admin';
    }
}).catch(error => {
    console.error('API 호출 에러:', error);
});