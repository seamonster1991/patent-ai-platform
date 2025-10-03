import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import Button from './Button';

interface ErrorMessageProps {
  title?: string;
  message: string;
  errorCode?: string;
  onRetry?: () => void;
  showRetryButton?: boolean;
  className?: string;
}

export default function ErrorMessage({
  title = '오류가 발생했습니다',
  message,
  errorCode,
  onRetry,
  showRetryButton = true,
  className = ''
}: ErrorMessageProps) {
  const getErrorIcon = () => {
    if (errorCode === 'TIMEOUT_ERROR' || errorCode === 'NETWORK_ERROR') {
      return <WifiOff className="w-12 h-12 text-red-500 mx-auto mb-4" />;
    }
    return <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />;
  };

  const getErrorTitle = () => {
    switch (errorCode) {
      case 'TIMEOUT_ERROR':
        return '연결 시간 초과';
      case 'NETWORK_ERROR':
        return '네트워크 연결 오류';
      case 'API_ERROR':
        return 'API 서버 오류';
      default:
        return title;
    }
  };

  const getErrorDescription = () => {
    switch (errorCode) {
      case 'TIMEOUT_ERROR':
        return '서버 응답 시간이 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해주세요.';
      case 'NETWORK_ERROR':
        return '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
      case 'API_ERROR':
        return 'API 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      default:
        return message;
    }
  };

  return (
    <div className={`text-center py-12 px-6 ${className}`}>
      {getErrorIcon()}
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {getErrorTitle()}
      </h3>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {getErrorDescription()}
      </p>

      {errorCode && (
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
          오류 코드: {errorCode}
        </p>
      )}

      {showRetryButton && onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="inline-flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          다시 시도
        </Button>
      )}

      <div className="mt-6 text-sm text-gray-500 dark:text-gray-500">
        <p>문제가 지속되면 다음을 확인해주세요:</p>
        <ul className="mt-2 space-y-1">
          <li>• 인터넷 연결 상태</li>
          <li>• 방화벽 또는 보안 소프트웨어 설정</li>
          <li>• 브라우저 캐시 및 쿠키 삭제</li>
        </ul>
      </div>
    </div>
  );
}

// 네트워크 상태 표시 컴포넌트
export function NetworkStatus({ isOnline }: { isOnline: boolean }) {
  return (
    <div className={`flex items-center space-x-2 text-sm ${
      isOnline ? 'text-green-600' : 'text-red-600'
    }`}>
      {isOnline ? (
        <Wifi className="w-4 h-4" />
      ) : (
        <WifiOff className="w-4 h-4" />
      )}
      <span>{isOnline ? '온라인' : '오프라인'}</span>
    </div>
  );
}