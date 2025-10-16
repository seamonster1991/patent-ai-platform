import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Coins } from 'lucide-react';

interface PointBalanceProps {
  className?: string;
  showDetails?: boolean;
}

interface PointBalance {
  current_balance: number;
  last_updated: string;
}

const PointBalance: React.FC<PointBalanceProps> = ({ className = '', showDetails = true }) => {
  const [balance, setBalance] = useState<PointBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUserAndLoadBalance();
  }, []);

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

      const response = await fetch(`/api/points?action=balance`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const balanceData = await response.json();
        setBalance(balanceData);
      }
    } catch (error) {
      console.error('포인트 잔액 로드 실패:', error);
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
    <div className={`flex items-center space-x-2 bg-gradient-to-r from-olive-50 to-olive-100 px-3 py-2 rounded-lg border border-olive-200 ${className}`}>
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
  );
};

export default PointBalance;