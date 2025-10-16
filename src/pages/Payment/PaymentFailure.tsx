import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, AlertTriangle, RefreshCw, Home, ArrowLeft, HelpCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface FailureInfo {
  orderId?: string;
  errorCode?: string;
  errorMessage?: string;
  timestamp?: string;
  amount?: number;
  goodsName?: string;
}

const PaymentFailure: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [failureInfo, setFailureInfo] = useState<FailureInfo>({});
  const [loading, setLoading] = useState(true);

  const orderId = searchParams.get('orderId');
  const error = searchParams.get('error');
  const errorCode = searchParams.get('errorCode');

  useEffect(() => {
    fetchFailureInfo();
  }, [orderId, error, errorCode]);

  const fetchFailureInfo = async () => {
    try {
      if (orderId) {
        // 주문 정보가 있는 경우 서버에서 상세 정보 조회
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/payment/failure-info?orderId=${orderId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setFailureInfo(data.info);
        } else {
          // 서버에서 정보를 가져올 수 없는 경우 URL 파라미터 사용
          setFailureInfo({
            orderId,
            errorMessage: error || '결제 처리 중 오류가 발생했습니다.',
            errorCode: errorCode || 'UNKNOWN_ERROR',
            timestamp: new Date().toISOString()
          });
        }
      } else {
        // 주문 ID가 없는 경우 URL 파라미터만 사용
        setFailureInfo({
          errorMessage: error || '결제 처리 중 오류가 발생했습니다.',
          errorCode: errorCode || 'UNKNOWN_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failure info fetch error:', err);
      setFailureInfo({
        orderId,
        errorMessage: error || '결제 처리 중 오류가 발생했습니다.',
        errorCode: errorCode || 'FETCH_ERROR',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const getErrorDescription = (errorCode?: string) => {
    const errorDescriptions: Record<string, string> = {
      'USER_CANCEL': '사용자가 결제를 취소했습니다.',
      'CARD_ERROR': '카드 정보가 올바르지 않거나 결제가 거절되었습니다.',
      'INSUFFICIENT_FUNDS': '잔액이 부족합니다.',
      'EXPIRED_CARD': '카드가 만료되었습니다.',
      'INVALID_CARD': '유효하지 않은 카드입니다.',
      'NETWORK_ERROR': '네트워크 오류가 발생했습니다.',
      'TIMEOUT': '결제 시간이 초과되었습니다.',
      'SYSTEM_ERROR': '시스템 오류가 발생했습니다.',
      'AMOUNT_MISMATCH': '결제 금액이 일치하지 않습니다.',
      'SIGNATURE_ERROR': '보안 검증에 실패했습니다.',
      'DUPLICATE_ORDER': '중복된 주문입니다.',
      'UNKNOWN_ERROR': '알 수 없는 오류가 발생했습니다.'
    };

    return errorDescriptions[errorCode || 'UNKNOWN_ERROR'] || '알 수 없는 오류가 발생했습니다.';
  };

  const getSolutionSuggestion = (errorCode?: string) => {
    const solutions: Record<string, string[]> = {
      'USER_CANCEL': [
        '다시 결제를 시도해 보세요.',
        '다른 결제 수단을 이용해 보세요.'
      ],
      'CARD_ERROR': [
        '카드 정보를 다시 확인해 주세요.',
        '다른 카드로 결제를 시도해 보세요.',
        '카드사에 문의하여 결제 제한 여부를 확인해 주세요.'
      ],
      'INSUFFICIENT_FUNDS': [
        '계좌 잔액을 확인해 주세요.',
        '다른 카드나 계좌로 결제를 시도해 보세요.'
      ],
      'EXPIRED_CARD': [
        '새로운 카드로 결제를 시도해 주세요.',
        '카드 유효기간을 확인해 주세요.'
      ],
      'NETWORK_ERROR': [
        '인터넷 연결을 확인해 주세요.',
        '잠시 후 다시 시도해 주세요.'
      ],
      'TIMEOUT': [
        '결제 페이지를 새로고침하고 다시 시도해 주세요.',
        '안정적인 인터넷 환경에서 결제를 진행해 주세요.'
      ]
    };

    return solutions[errorCode || 'UNKNOWN_ERROR'] || [
      '잠시 후 다시 시도해 주세요.',
      '문제가 지속되면 고객지원팀에 문의해 주세요.'
    ];
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRetryPayment = () => {
    navigate('/payment');
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent('결제 오류 문의');
    const body = encodeURIComponent(`
주문번호: ${failureInfo.orderId || 'N/A'}
오류코드: ${failureInfo.errorCode || 'N/A'}
오류메시지: ${failureInfo.errorMessage || 'N/A'}
발생시간: ${formatDateTime(failureInfo.timestamp)}

상세 내용:
`);
    window.location.href = `mailto:support@patent-ai.com?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">결제 오류 정보를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* 실패 헤더 */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">결제에 실패했습니다</h1>
            <p className="text-gray-600">
              결제 처리 중 문제가 발생했습니다. 아래 정보를 확인해 주세요.
            </p>
          </div>
        </div>

        {/* 오류 정보 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
            오류 정보
          </h2>
          
          <div className="space-y-4">
            {failureInfo.orderId && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">주문번호</span>
                <span className="font-mono text-sm">{failureInfo.orderId}</span>
              </div>
            )}
            
            {failureInfo.errorCode && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">오류코드</span>
                <span className="font-mono text-sm text-red-600">{failureInfo.errorCode}</span>
              </div>
            )}
            
            <div className="flex justify-between items-start py-2 border-b border-gray-100">
              <span className="text-gray-600">오류내용</span>
              <span className="text-right max-w-xs">{getErrorDescription(failureInfo.errorCode)}</span>
            </div>
            
            {failureInfo.goodsName && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">상품명</span>
                <span className="font-medium">{failureInfo.goodsName}</span>
              </div>
            )}
            
            {failureInfo.amount && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">결제금액</span>
                <span className="font-bold">{failureInfo.amount.toLocaleString()}원</span>
              </div>
            )}
            
            {failureInfo.timestamp && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">발생시간</span>
                <span>{formatDateTime(failureInfo.timestamp)}</span>
              </div>
            )}
          </div>
        </div>

        {/* 해결 방법 제안 */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <HelpCircle className="w-5 h-5 mr-2 text-blue-600" />
            해결 방법
          </h3>
          
          <ul className="space-y-2">
            {getSolutionSuggestion(failureInfo.errorCode).map((solution, index) => (
              <li key={index} className="flex items-start">
                <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span className="text-gray-700">{solution}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 액션 버튼들 */}
        <div className="space-y-3">
          <button
            onClick={handleRetryPayment}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            다시 결제하기
          </button>
          
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <Home className="w-5 h-5 mr-2" />
            대시보드로 이동
          </button>
          
          <button
            onClick={handleContactSupport}
            className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            <HelpCircle className="w-5 h-5 mr-2" />
            고객지원팀 문의
          </button>
        </div>

        {/* 추가 안내 */}
        <div className="bg-yellow-50 rounded-lg p-4 mt-6 border border-yellow-200">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-800 mb-1">참고사항</h4>
              <p className="text-sm text-yellow-700">
                결제가 실패했지만 카드사에서 승인이 이루어진 경우, 
                일반적으로 1-3일 내에 자동으로 취소됩니다. 
                취소가 되지 않는 경우 고객지원팀으로 문의해 주세요.
              </p>
            </div>
          </div>
        </div>

        {/* 고객 지원 안내 */}
        <div className="bg-gray-100 rounded-lg p-4 mt-6">
          <p className="text-sm text-gray-600 text-center">
            결제 관련 문의사항이 있으시면{' '}
            <button 
              onClick={handleContactSupport}
              className="text-blue-600 hover:underline"
            >
              고객지원팀
            </button>
            으로 연락해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;