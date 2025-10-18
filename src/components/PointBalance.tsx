import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Coins } from 'lucide-react';
import { PointBalanceUpdateEventDetail } from '../utils/eventUtils';

interface PointBalanceProps {
  className?: string;
  showDetails?: boolean;
}

interface PointBalance {
  current_balance: number;
  last_updated: string;
  expiring_soon?: {
    amount: number;
    expires_at: string;
    days_left: number;
  } | null;
}

const PointBalance: React.FC<PointBalanceProps> = ({ className = '', showDetails = true }) => {
  const [balance, setBalance] = useState<PointBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUserAndLoadBalance();

    // 포인트 잔액 업데이트 이벤트 리스너 추가
    const handlePointBalanceUpdate = (event: CustomEvent<PointBalanceUpdateEventDetail>) => {
      console.log('💰 [PointBalance] pointBalanceUpdate 이벤트 수신:', event.detail);
      if (user) {
        loadPointBalance(user.id);
      }
    };

    window.addEventListener('pointBalanceUpdate', handlePointBalanceUpdate as EventListener);

    return () => {
      window.removeEventListener('pointBalanceUpdate', handlePointBalanceUpdate as EventListener);
    };
  }, [user]);

  const checkUserAndLoadBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        await loadPointBalance(user.id);
      }
    } catch (error) {
      console.error('사용자 확인 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPointBalance = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // API 기본 URL 설정 (개발/프로덕션 환경 대응)
      const apiBaseUrl = process.env.NODE_ENV === 'production' 
        ? '' // Vercel에서는 상대 경로 사용
        : 'http://localhost:3001'; // 로컬 개발 환경

      const response = await fetch(`${apiBaseUrl}/api/points?action=balance`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const balanceData = await response.json();
        console.log('💰 [PointBalance] 포인트 잔액 로드 성공:', balanceData);
        setBalance(balanceData);
      } else {
        console.error('💰 [PointBalance] 포인트 잔액 로드 실패:', response.status, response.statusText);
        // 실패 시 기본값 설정
        setBalance({ current_balance: 0, last_updated: new Date().toISOString() });
      }
    } catch (error) {
      console.error('포인트 잔액 로드 실패:', error);
      // 에러 시 기본값 설정
      setBalance({ current_balance: 0, last_updated: new Date().toISOString() });
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Coins className="w-5 h-5 text-olive-600" />
        <span className="text-sm text-gray-500">로딩중...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-olive-50 to-olive-100 px-3 py-2 rounded-lg border border-olive-200 ${className}`}>
      <div className="flex items-center space-x-2">
        <Coins className="w-5 h-5 text-olive-600" />
        <span className="text-sm font-semibold text-olive-800">
          {balance ? balance.current_balance.toLocaleString() : '0'}P
        </span>
        {showDetails && balance && (
          <span className="text-xs text-gray-500">
            ({new Date(balance.last_updated).toLocaleDateString()})
          </span>
        )}
      </div>
      
      {/* 만료 예정 포인트 알림 */}
      {balance?.expiring_soon && balance.expiring_soon.amount > 0 && (
        <div className="mt-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
          ⚠️ {balance.expiring_soon.amount.toLocaleString()}P가 {balance.expiring_soon.days_left}일 후 만료됩니다
        </div>
      )}
    </div>
  );
};

export default PointBalance;