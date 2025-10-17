// 관리자 로그인 폼에 자동으로 정보 입력하고 제출하는 스크립트
setTimeout(() => {
    const emailInput = document.querySelector('input[name=email]');
    const passwordInput = document.querySelector('input[name=password]');
    const submitButton = document.querySelector('button[type=submit]');
    
    if (emailInput && passwordInput && submitButton) {
        emailInput.value = 'admin@p-ai.co.kr';
        passwordInput.value = 'admin123';
        
        // React의 상태 업데이트를 위해 이벤트 트리거
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log('관리자 로그인 정보 입력 완료');
        
        // 폼 제출
        setTimeout(() => {
            submitButton.click();
            console.log('로그인 폼 제출됨');
        }, 500);
    } else {
        console.error('로그인 폼 요소를 찾을 수 없습니다');
    }
}, 1000);