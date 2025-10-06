import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const checkToken = async () => {
      try {
        // URL에서 토큰 확인
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        
        if (!accessToken || !refreshToken) {
          setError('유효하지 않은 재설정 링크입니다.');
          setIsCheckingToken(false);
          return;
        }

        // Supabase 세션 설정
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          setIsValidToken(true);
        } else {
          setError('세션을 설정할 수 없습니다.');
        }
      } catch (error: any) {
        console.error('Token validation error:', error);
        setError('유효하지 않거나 만료된 재설정 링크입니다.');
      } finally {
        setIsCheckingToken(false);
      }
    };

    checkToken();
  }, [searchParams]);

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return '비밀번호는 최소 8자 이상이어야 합니다.';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return '비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다.';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 비밀번호 유효성 검사
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      
      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      console.error('Password update error:', error);
      setError('비밀번호 재설정에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingToken) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ms-burgundy mx-auto mb-4"></div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                링크 확인 중...
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                재설정 링크를 확인하고 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                유효하지 않은 링크
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {error || '재설정 링크가 유효하지 않거나 만료되었습니다.'}
              </p>
              <button
                onClick={() => navigate('/forgot-password')}
                className="w-full bg-ms-olive hover:bg-ms-olive/90 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                새 재설정 링크 요청
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                비밀번호가 재설정되었습니다
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                새로운 비밀번호로 로그인할 수 있습니다. 잠시 후 로그인 페이지로 이동합니다.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-ms-olive hover:bg-ms-olive/90 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                로그인 페이지로 이동
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center w-16 h-16 bg-ms-olive/10 dark:bg-ms-olive/20 rounded-full mx-auto mb-4">
               <Lock className="w-8 h-8 text-ms-olive" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              새 비밀번호 설정
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              새로운 비밀번호를 입력해주세요.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                새 비밀번호
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-12 py-3 border border-ms-line dark:border-dark-700 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ms-olive focus:border-ms-olive"
                  placeholder="새 비밀번호를 입력하세요"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                최소 8자, 대문자, 소문자, 숫자 포함
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                비밀번호 확인
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-12 py-3 border border-ms-line dark:border-dark-700 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ms-burgundy focus:border-ms-burgundy"
                  placeholder="비밀번호를 다시 입력하세요"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full bg-ms-olive hover:bg-ms-olive/90 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  재설정 중...
                </>
              ) : (
                '비밀번호 재설정'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center text-ms-burgundy hover:text-ms-burgundy font-bold transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              로그인 페이지로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;