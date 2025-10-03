import React from 'react';
import { Button } from '../UI/Button';

interface ErrorDetails {
  message: string;
  type?: string;
  status?: number;
  details?: any;
  timestamp?: string;
}

interface ReportErrorStateProps {
  error: string | ErrorDetails;
  onRetry: () => void;
}

const ReportErrorState: React.FC<ReportErrorStateProps> = ({ error, onRetry }) => {
  // 에러 객체 정규화
  const normalizedError = typeof error === 'string' 
    ? { message: error, type: 'general' }
    : error;

  const getErrorIcon = () => {
    switch (normalizedError.type) {
      case 'network':
        return '🌐';
      case 'timeout':
        return '⏰';
      case 'api':
      case 'authentication':
        return '🔑';
      case 'quota':
        return '📊';
      case 'validation':
        return '📝';
      default:
        return '❌';
    }
  };

  const getErrorInfo = () => {
    switch (normalizedError.type) {
      case 'network':
        return {
          title: '네트워크 연결 오류',
          description: '인터넷 연결에 문제가 있습니다.',
          tips: [
            'Wi-Fi 또는 이더넷 연결 상태 확인',
            'VPN 연결 해제 후 재시도',
            '방화벽 또는 보안 소프트웨어 설정 확인',
            '다른 네트워크에서 시도'
          ],
          color: 'blue'
        };
      
      case 'timeout':
        return {
          title: 'AI 분석 시간 초과',
          description: '분석 시간이 예상보다 오래 걸리고 있습니다.',
          tips: [
            '잠시 후 다시 시도해주세요',
            '복잡한 특허 데이터는 분석 시간이 오래 걸릴 수 있습니다',
            '네트워크 연결 상태를 확인해주세요',
            '브라우저를 새로고침 후 재시도'
          ],
          color: 'yellow'
        };
      
      case 'api':
      case 'authentication':
        return {
          title: 'AI 서비스 인증 오류',
          description: 'AI 서비스 접근에 문제가 발생했습니다.',
          tips: [
            '잠시 후 다시 시도해주세요',
            '문제가 지속되면 관리자에게 문의하세요',
            '브라우저 쿠키 및 캐시를 삭제해보세요'
          ],
          color: 'red'
        };
      
      case 'quota':
        return {
          title: 'AI 서비스 사용량 한도 초과',
          description: 'AI 서비스 사용량 한도에 도달했습니다.',
          tips: [
            '잠시 후 다시 시도해주세요',
            '사용량이 초기화될 때까지 기다려주세요',
            '관리자에게 사용량 증설을 요청하세요'
          ],
          color: 'orange'
        };
      
      case 'validation':
        return {
          title: '데이터 검증 오류',
          description: '입력된 특허 데이터에 문제가 있습니다.',
          tips: [
            '특허 데이터를 다시 확인해주세요',
            '필수 정보가 누락되었는지 확인하세요',
            '다른 특허로 시도해보세요',
            '페이지를 새로고침 후 재시도'
          ],
          color: 'purple'
        };
      
      default:
        return {
          title: '리포트 생성 오류',
          description: normalizedError.message || '알 수 없는 오류가 발생했습니다.',
          tips: [
            '페이지를 새로고침 후 재시도',
            '브라우저 캐시를 삭제해보세요',
            '다른 브라우저에서 시도해보세요',
            '문제가 지속되면 관리자에게 문의하세요'
          ],
          color: 'red'
        };
    }
  };

  const errorInfo = getErrorInfo();
  
  const getColorClasses = (color: string) => {
    const colorMap = {
      red: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        title: 'text-red-800',
        description: 'text-red-600',
        tips: 'text-red-600',
        button: 'bg-red-600 hover:bg-red-700'
      },
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        title: 'text-blue-800',
        description: 'text-blue-600',
        tips: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700'
      },
      yellow: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        title: 'text-yellow-800',
        description: 'text-yellow-600',
        tips: 'text-yellow-600',
        button: 'bg-yellow-600 hover:bg-yellow-700'
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        title: 'text-orange-800',
        description: 'text-orange-600',
        tips: 'text-orange-600',
        button: 'bg-orange-600 hover:bg-orange-700'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        title: 'text-purple-800',
        description: 'text-purple-600',
        tips: 'text-purple-600',
        button: 'bg-purple-600 hover:bg-purple-700'
      }
    };
    return colorMap[color] || colorMap.red;
  };

  const colors = getColorClasses(errorInfo.color);

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${colors.bg} rounded-lg border ${colors.border}`}>
      <div className="text-6xl mb-4">{getErrorIcon()}</div>
      
      <h3 className={`text-xl font-semibold ${colors.title} mb-2`}>
        {errorInfo.title}
      </h3>
      
      <p className={`${colors.description} mb-4 max-w-md`}>
        {errorInfo.description}
      </p>

      {/* 에러 상세 정보 (개발 모드에서만) */}
      {normalizedError.status && (
        <div className={`text-sm ${colors.description} mb-4 opacity-75`}>
          상태 코드: {normalizedError.status}
          {normalizedError.timestamp && (
            <span className="ml-2">
              • {new Date(normalizedError.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      <div className="mb-6 text-left max-w-md">
        <h4 className={`font-medium ${colors.title} mb-2`}>해결 방법:</h4>
        <ul className={`text-sm ${colors.tips} space-y-1`}>
          {errorInfo.tips.map((tip, index) => (
            <li key={index} className="flex items-start">
              <span className="mr-2 flex-shrink-0">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button 
        onClick={onRetry}
        className={`${colors.button} text-white px-6 py-2 rounded-lg transition-colors font-medium`}
      >
        다시 시도
      </Button>
      
      {/* 추가 도움말 */}
      <div className={`mt-4 text-xs ${colors.tips} opacity-75 max-w-md`}>
        문제가 계속 발생하면 브라우저 개발자 도구(F12)의 콘솔을 확인하거나 관리자에게 문의하세요.
      </div>
    </div>
  );
};

export default ReportErrorState;