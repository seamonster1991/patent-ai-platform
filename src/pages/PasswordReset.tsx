import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { requestPasswordReset } from '../lib/api';

const PasswordReset: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'request' | 'reset'>('request');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // 요청 모드 상태
  const [email, setEmail] = useState('');
  
  // 재설정 모드 상태
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  useEffect(() => {
    // URL에서 토큰 확인
    const access_token = searchParams.get('access_token');
    const refresh_token = searchParams.get('refresh_token');
    const type = searchParams.get('type');

    if (access_token && refresh_token && type === 'recovery') {
      setMode('reset');
      setAccessToken(access_token);
      setRefreshToken(refresh_token);
    }
  }, [searchParams]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    if (!validateEmail(email)) {
      toast.error('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const response = await requestPasswordReset(email);
      
      if (response.success) {
        toast.success('비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요.');
        setEmail('');
      } else {
        toast.error(response.error || '비밀번호 재설정 요청에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('비밀번호 재설정 요청 오류:', error);
      toast.error('비밀번호 재설정 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }

    if (!validatePassword(newPassword)) {
      toast.error('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);

    try {
      // Supabase 세션 설정
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (sessionError) {
        console.error('세션 설정 오류:', sessionError);
        toast.error('유효하지 않은 재설정 링크입니다.');
        return;
      }

      // 비밀번호 업데이트
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('비밀번호 업데이트 오류:', updateError);
        toast.error('비밀번호 재설정에 실패했습니다.');
        return;
      }

      toast.success('비밀번호가 성공적으로 재설정되었습니다.');
      
      // 로그인 페이지로 리다이렉트
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (error: any) {
      console.error('비밀번호 재설정 오류:', error);
      toast.error('비밀번호 재설정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {mode === 'request' ? '비밀번호 재설정' : '새 비밀번호 설정'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {mode === 'request' 
                ? '등록된 이메일로 재설정 링크를 보내드립니다.' 
                : '새로운 비밀번호를 설정해주세요.'
              }
            </p>
          </div>

          {mode === 'request' ? (
            /* 비밀번호 재설정 요청 폼 */
            <form onSubmit={handlePasswordResetRequest} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  이메일 주소
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="이메일을 입력하세요"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '전송 중...' : '재설정 링크 전송'}
              </button>
            </form>
          ) : (
            /* 새 비밀번호 설정 폼 */
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  새 비밀번호
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="새 비밀번호 (최소 8자)"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호 확인
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="비밀번호를 다시 입력하세요"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '설정 중...' : '비밀번호 재설정'}
              </button>
            </form>
          )}

          {/* 로그인으로 돌아가기 */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              로그인으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;