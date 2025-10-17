import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminStore } from '../stores/useAdminStore';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, logout, isAuthenticated, isLoading, error } = useAdminStore();

  // 개별 상태 변수들
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  console.log('🔄 [AdminLogin] 컴포넌트 렌더링 시작');
  console.log('🔍 [AdminLogin] 상태 확인:', { email, password, twoFactorCode, isLoading, error });
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);

  // 컴포넌트 마운트 시 기존 토큰 클리어
  useEffect(() => {
    console.log('🔄 [AdminLogin] 컴포넌트 마운트, 기존 토큰 클리어');
    logout();
  }, [logout]);

  // 이미 인증된 경우 대시보드로 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      console.log('✅ [AdminLogin] 이미 인증됨, 대시보드로 리다이렉트');
      const from = location.state?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 [AdminLogin] 폼 제출 시작 - handleSubmit 호출됨');
    console.log('🚀 [AdminLogin] 폼 데이터:', { email, password });

    try {
      // 빈 필드 체크
      if (!email || !password) {
        console.log('❌ [AdminLogin] 이메일 또는 비밀번호가 없음');
        return;
      }

      console.log('🔐 [AdminLogin] 로그인 시도:', { email });
      
      // 로그인 시도
      const credentials = {
        email,
        password,
        totp_code: twoFactorCode
      };
      const result = await login(credentials);
      
      if (result.success) {
        console.log('✅ [AdminLogin] 로그인 성공, 관리자 페이지로 리다이렉트');
        navigate('/admin');
      } else if (result.requires2FA) {
        console.log('🔐 [AdminLogin] 2FA 필요');
        setRequires2FA(true);
      } else {
        console.log('❌ [AdminLogin] 로그인 실패:', result.error);
      }
    } catch (error) {
      console.error('❌ [AdminLogin] 로그인 에러:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-600">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            관리자 로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            관리자 계정으로 시스템에 접속하세요
          </p>
        </div>

        <div className="bg-white py-8 px-8 shadow-lg rounded-lg">
          <form 
            className="space-y-6" 
            onSubmit={handleSubmit}
          >
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">로그인 실패</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{Array.isArray(error) ? error.map(e => typeof e === 'object' ? e.msg || JSON.stringify(e) : e).join(', ') : error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                이메일 주소
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="이메일 주소"
                  value={email}
                  onChange={(e) => {
                    console.log('📧 [AdminLogin] 이메일 입력:', e.target.value);
                    setEmail(e.target.value);
                  }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => {
                    console.log('🔒 [AdminLogin] 비밀번호 입력:', e.target.value);
                    setPassword(e.target.value);
                  }}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {requires2FA && (
               <div>
                 <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700">
                   2단계 인증 코드
                 </label>
                 <div className="mt-1">
                   <input
                     id="twoFactorCode"
                     name="twoFactorCode"
                     type="text"
                     autoComplete="one-time-code"
                     required
                     className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center tracking-widest"
                     placeholder="2단계 인증 코드 (6자리)"
                     value={twoFactorCode}
                     onChange={(e) => setTwoFactorCode(e.target.value)}
                     maxLength={6}
                   />
                 </div>
               </div>
             )}

            <div>
              <button
                type="submit"
                onClick={(e) => {
                  console.log('🔥 [AdminLogin] 버튼 클릭됨!');
                  handleSubmit(e);
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || !email || !password}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">로그인 중...</span>
                  </div>
                ) : (
                  '로그인'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">보안 정보</span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                이 시스템은 관리자 전용입니다. 무단 접근 시 법적 조치를 받을 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;