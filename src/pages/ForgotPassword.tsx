import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Shield, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
    } catch (error: any) {
      console.error('Password reset error:', error);
      if (error.message.includes('User not found')) {
        setError('등록되지 않은 이메일 주소입니다.');
      } else if (error.message.includes('Email rate limit exceeded')) {
        setError('이메일 전송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError('비밀번호 재설정 이메일 전송에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-olive-50 to-olive-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl border border-olive-200 p-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-olive-100 rounded-full mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-olive-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                이메일을 확인해주세요
              </h1>
              <p className="text-gray-600 mb-6">
                <span className="font-medium">{email}</span>로 비밀번호 재설정 링크를 보냈습니다.
                이메일을 확인하고 링크를 클릭하여 비밀번호를 재설정하세요.
              </p>
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="w-full bg-olive-600 hover:bg-olive-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  로그인 페이지로 돌아가기
                </Link>
                <button
                  onClick={() => {
                    setIsSuccess(false);
                    setEmail('');
                  }}
                  className="w-full text-olive-600 hover:text-olive-700 font-medium py-2 transition-colors duration-200"
                >
                  다른 이메일로 재시도
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-olive-50 to-olive-100 flex">
      {/* Left side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-olive-600 to-olive-800 p-12 items-center justify-center">
        <div className="max-w-md text-white">
          <div className="flex items-center mb-8">
            <Shield className="w-10 h-10 mr-3" />
            <h1 className="text-3xl font-bold">Patent-AI</h1>
          </div>
          <h2 className="text-2xl font-semibold mb-6">비밀번호를 잊으셨나요?</h2>
          <p className="text-olive-100 mb-8 leading-relaxed">
            걱정하지 마세요. 등록하신 이메일 주소로 안전한 비밀번호 재설정 링크를 보내드립니다.
          </p>
          <div className="space-y-4">
            <div className="flex items-center">
              <FileText className="w-5 h-5 mr-3 text-olive-200" />
              <span className="text-olive-100">빠르고 안전한 재설정</span>
            </div>
            <div className="flex items-center">
              <Shield className="w-5 h-5 mr-3 text-olive-200" />
              <span className="text-olive-100">보안이 보장된 프로세스</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-olive-200 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center w-16 h-16 bg-olive-100 rounded-full mx-auto mb-4">
                <Mail className="w-8 h-8 text-olive-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                비밀번호 찾기
              </h1>
              <p className="text-gray-600">
                가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500 transition-colors"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-olive-600 hover:bg-olive-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    전송 중...
                  </>
                ) : (
                  '재설정 링크 보내기'
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-olive-600 hover:text-olive-700 font-medium transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                로그인 페이지로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;