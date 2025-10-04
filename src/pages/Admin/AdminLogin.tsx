import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Shield, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn(formData.email, formData.password);
      
      if (!result.error) {
        // 관리자 이메일 확인
        if (formData.email === 'admin@p-ai.com') {
          navigate('/admin/dashboard');
        } else {
          setError('관리자 계정이 아닙니다.');
        }
      } else {
        setError(result.error || '로그인에 실패했습니다.');
      }
    } catch (error) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.02%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      
      <div className="relative w-full max-w-md">
        {/* Admin Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-ms-olive rounded-2xl shadow-2xl mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">관리자 로그인</h1>
          <p className="text-slate-400">IP Insight AI 관리자 시스템</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
                관리자 이메일
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
              className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ms-olive focus:border-ms-olive transition-all duration-200"
                  placeholder="admin@p-ai.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
              className="block w-full pl-10 pr-12 py-3 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ms-olive focus:border-ms-olive transition-all duration-200"
                  placeholder="관리자 비밀번호"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-ms-olive hover:bg-ms-olive/90 text-white py-3 px-4 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-ms-olive focus:ring-offset-2 focus:ring-offset-dark-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>로그인 중...</span>
                </div>
              ) : (
                '관리자 로그인'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="text-center">
              <Link 
                to="/login" 
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                일반 사용자 로그인으로 돌아가기
              </Link>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            이 페이지는 관리자 전용입니다. 무단 접근 시 법적 조치를 받을 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;