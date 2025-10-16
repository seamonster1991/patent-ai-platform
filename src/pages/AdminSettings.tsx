/**
 * 관리자 설정 페이지
 * 시스템 설정, 사용자 역할 관리, 애플리케이션 설정
 */

import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/Admin/AdminLayout';
import { Card } from '../components/UI/Card';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { 
  CogIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  BellIcon,
  GlobeAltIcon,
  CircleStackIcon,
  KeyIcon,
  DocumentTextIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  maxFileSize: number;
  sessionTimeout: number;
}

interface SecuritySettings {
  passwordMinLength: number;
  requireSpecialChars: boolean;
  requireNumbers: boolean;
  requireUppercase: boolean;
  twoFactorRequired: boolean;
  loginAttempts: number;
  lockoutDuration: number;
}

const AdminSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('system');
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    siteName: 'Patent AI',
    siteDescription: 'AI 기반 특허 분석 플랫폼',
    maintenanceMode: false,
    registrationEnabled: true,
    emailNotifications: true,
    smsNotifications: false,
    maxFileSize: 10,
    sessionTimeout: 30
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    passwordMinLength: 8,
    requireSpecialChars: true,
    requireNumbers: true,
    requireUppercase: true,
    twoFactorRequired: false,
    loginAttempts: 5,
    lockoutDuration: 15
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const tabs = [
    { id: 'system', name: '시스템 설정', icon: CogIcon },
    { id: 'security', name: '보안 설정', icon: ShieldCheckIcon },
    { id: 'users', name: '사용자 역할', icon: UserGroupIcon },
    { id: 'notifications', name: '알림 설정', icon: BellIcon },
    { id: 'api', name: 'API 설정', icon: KeyIcon },
    { id: 'backup', name: '백업 설정', icon: CircleStackIcon }
  ];

  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    try {
      // API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const renderSystemSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">기본 설정</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사이트 이름
            </label>
            <input
              type="text"
              value={systemSettings.siteName}
              onChange={(e) => setSystemSettings(prev => ({ ...prev, siteName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사이트 설명
            </label>
            <input
              type="text"
              value={systemSettings.siteDescription}
              onChange={(e) => setSystemSettings(prev => ({ ...prev, siteDescription: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              최대 파일 크기 (MB)
            </label>
            <input
              type="number"
              value={systemSettings.maxFileSize}
              onChange={(e) => setSystemSettings(prev => ({ ...prev, maxFileSize: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              세션 타임아웃 (분)
            </label>
            <input
              type="number"
              value={systemSettings.sessionTimeout}
              onChange={(e) => setSystemSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">시스템 옵션</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">유지보수 모드</h4>
              <p className="text-sm text-gray-500">사이트를 일시적으로 비활성화합니다</p>
            </div>
            <button
              onClick={() => setSystemSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                systemSettings.maintenanceMode ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  systemSettings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">회원가입 허용</h4>
              <p className="text-sm text-gray-500">새로운 사용자의 회원가입을 허용합니다</p>
            </div>
            <button
              onClick={() => setSystemSettings(prev => ({ ...prev, registrationEnabled: !prev.registrationEnabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                systemSettings.registrationEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  systemSettings.registrationEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">이메일 알림</h4>
              <p className="text-sm text-gray-500">시스템 이벤트에 대한 이메일 알림을 발송합니다</p>
            </div>
            <button
              onClick={() => setSystemSettings(prev => ({ ...prev, emailNotifications: !prev.emailNotifications }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                systemSettings.emailNotifications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  systemSettings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">비밀번호 정책</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              최소 길이
            </label>
            <input
              type="number"
              value={securitySettings.passwordMinLength}
              onChange={(e) => setSecuritySettings(prev => ({ ...prev, passwordMinLength: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              로그인 시도 제한
            </label>
            <input
              type="number"
              value={securitySettings.loginAttempts}
              onChange={(e) => setSecuritySettings(prev => ({ ...prev, loginAttempts: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">특수문자 필수</h4>
              <p className="text-sm text-gray-500">비밀번호에 특수문자를 포함해야 합니다</p>
            </div>
            <button
              onClick={() => setSecuritySettings(prev => ({ ...prev, requireSpecialChars: !prev.requireSpecialChars }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                securitySettings.requireSpecialChars ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  securitySettings.requireSpecialChars ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">숫자 필수</h4>
              <p className="text-sm text-gray-500">비밀번호에 숫자를 포함해야 합니다</p>
            </div>
            <button
              onClick={() => setSecuritySettings(prev => ({ ...prev, requireNumbers: !prev.requireNumbers }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                securitySettings.requireNumbers ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  securitySettings.requireNumbers ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">2단계 인증 필수</h4>
              <p className="text-sm text-gray-500">모든 사용자에게 2단계 인증을 요구합니다</p>
            </div>
            <button
              onClick={() => setSecuritySettings(prev => ({ ...prev, twoFactorRequired: !prev.twoFactorRequired }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                securitySettings.twoFactorRequired ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  securitySettings.twoFactorRequired ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlaceholderTab = (title: string, description: string) => (
    <div className="text-center py-12">
      <div className="mx-auto h-12 w-12 text-gray-400">
        <CogIcon />
      </div>
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <div className="mt-6">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          설정하기
        </button>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'system':
        return renderSystemSettings();
      case 'security':
        return renderSecuritySettings();
      case 'users':
        return renderPlaceholderTab('사용자 역할 관리', '사용자 권한과 역할을 관리합니다');
      case 'notifications':
        return renderPlaceholderTab('알림 설정', '시스템 알림과 이메일 설정을 관리합니다');
      case 'api':
        return renderPlaceholderTab('API 설정', 'API 키와 외부 서비스 연동을 관리합니다');
      case 'backup':
        return renderPlaceholderTab('백업 설정', '데이터 백업과 복원 설정을 관리합니다');
      default:
        return renderSystemSettings();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="bg-white shadow">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CogIcon className="h-8 w-8 text-gray-400 mr-3" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">관리자 설정</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      시스템 설정과 관리자 옵션을 구성합니다
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSaveSettings}
                  disabled={saveStatus === 'saving'}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    saveStatus === 'saving' 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : saveStatus === 'success'
                      ? 'bg-green-600 hover:bg-green-700'
                      : saveStatus === 'error'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {saveStatus === 'saving' && <LoadingSpinner size="sm" className="mr-2" />}
                  {saveStatus === 'success' && <CheckIcon className="h-4 w-4 mr-2" />}
                  {saveStatus === 'error' && <XMarkIcon className="h-4 w-4 mr-2" />}
                  {saveStatus === 'saving' ? '저장 중...' : 
                   saveStatus === 'success' ? '저장됨' :
                   saveStatus === 'error' ? '오류' : '설정 저장'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white shadow">
          <div className="px-4 sm:px-6 lg:px-8">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        <Card className="p-6">
          {renderTabContent()}
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;