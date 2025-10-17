// 브라우저 콘솔에서 실행할 관리자 로그인 테스트 스크립트
console.log('=== 관리자 로그인 테스트 시작 ===');

// 관리자 스토어 접근
const adminStore = window.useAdminStore?.getState();
if (!adminStore) {
    console.error('관리자 스토어를 찾을 수 없습니다');
} else {
    console.log('관리자 스토어 현재 상태:', {
        isAuthenticated: adminStore.isAuthenticated,
        admin: adminStore.admin,
        isLoading: adminStore.isLoading,
        error: adminStore.error
    });
    
    // 로그인 시도
    console.log('로그인 시도 중...');
    adminStore.login({
        email: 'admin@p-ai.co.kr',
        password: 'admin123'
    }).then(result => {
        console.log('로그인 결과:', result);
        console.log('로그인 후 상태:', {
            isAuthenticated: adminStore.isAuthenticated,
            admin: adminStore.admin,
            error: adminStore.error
        });
    }).catch(error => {
        console.error('로그인 에러:', error);
    });
}