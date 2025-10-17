// 관리자 로그인 폼 자동 입력 및 제출
const emailInput = document.querySelector('input[name="email"]');
const passwordInput = document.querySelector('input[name="password"]');
const submitButton = document.querySelector('button[type="submit"]');

if (emailInput && passwordInput && submitButton) {
    emailInput.value = 'admin@p-ai.co.kr';
    passwordInput.value = 'admin123';
    
    // 입력 이벤트 트리거
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    console.log('관리자 로그인 정보 입력 완료');
    console.log('이메일:', emailInput.value);
    console.log('비밀번호:', passwordInput.value ? '입력됨' : '입력안됨');
    
    // 폼 제출
    submitButton.click();
    console.log('로그인 폼 제출됨');
} else {
    console.error('로그인 폼 요소를 찾을 수 없습니다');
}