// 브라우저 콘솔에서 실행할 관리자 로그인 테스트
console.log('=== 관리자 로그인 테스트 시작 ===');

// 관리자 스토어에 직접 접근하여 로그인 시도
const testLogin = async () => {
    try {
        // 관리자 API 직접 호출
        const response = await fetch('http://localhost:8000/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@p-ai.co.kr',
                password: 'admin123'
            })
        });
        
        const data = await response.json();
        console.log('API 응답:', data);
        
        if (data.access_token) {
            // 토큰을 로컬 스토리지에 저장
            localStorage.setItem('admin_token', data.access_token);
            localStorage.setItem('admin_refresh_token', data.refresh_token);
            console.log('토큰 저장 완료');
            
            // 페이지 새로고침하여 인증 상태 업데이트
            window.location.reload();
        }
    } catch (error) {
        console.error('로그인 에러:', error);
    }
};

// 로그인 실행
testLogin();