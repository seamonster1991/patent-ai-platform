import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Coins, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ExpiringPoint {
  id: string;
  points: number;
  remaining_points: number;
  expiration_date: string;
  created_at: string;
}

interface ExpiringPointsData {
  totalExpiringPoints: number;
  expiringPoints: ExpiringPoint[];
  pointsByDate: Record<string, ExpiringPoint[]>;
  daysChecked: number;
}

interface ExpiringPointsAlertProps {
  userId?: string;
  days?: number;
  className?: string;
}

const ExpiringPointsAlert: React.FC<ExpiringPointsAlertProps> = ({ 
  userId, 
  days = 7, 
  className = '' 
}) => {
  const [expiringData, setExpiringData] = useState<ExpiringPointsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUserAndLoadExpiringPoints();
  }, [userId, days]);

  const checkUserAndLoadExpiringPoints = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user || userId) {
        await loadExpiringPoints(userId || user?.id);
      }
    } catch (error) {
      console.error('사용자 확인 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExpiringPoints = async (targetUserId: string) => {
    try {
      const response = await fetch(`/api/points/expiring-points?userId=${targetUserId}&days=${days}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setExpiringData(result.data);
        }
      }
    } catch (error) {
      console.error('만료 예정 포인트 로드 실패:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '오늘';
    } else if (diffDays === 1) {
      return '내일';
    } else if (diffDays > 0) {
      return `${diffDays}일 후`;
    } else {
      return '만료됨';
    }
  };

  const getUrgencyLevel = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return 'critical';
    if (diffDays <= 3) return 'warning';
    return 'info';
  };

  if (loading || !user || dismissed) {
    return null;
  }

  if (!expiringData || expiringData.totalExpiringPoints === 0) {
    return null;
  }

  const urgencyLevel = getUrgencyLevel(expiringData.expiringPoints[0]?.expiration_date);
  
  const alertStyles = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const iconStyles = {
    critical: 'text-red-600',
    warning: 'text-amber-600',
    info: 'text-blue-600'
  };

  return (
    <div className={`${alertStyles[urgencyLevel]} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {urgencyLevel === 'critical' ? (
              <AlertTriangle className={`w-5 h-5 ${iconStyles[urgencyLevel]}`} />
            ) : (
              <Clock className={`w-5 h-5 ${iconStyles[urgencyLevel]}`} />
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1">
              {urgencyLevel === 'critical' && '긴급: '}
              포인트 만료 예정 알림
            </h3>
            
            <div className="text-sm mb-2">
              <div className="flex items-center space-x-2 mb-1">
                <Coins className="w-4 h-4" />
                <span className="font-medium">
                  {expiringData.totalExpiringPoints.toLocaleString()}P가 {days}일 내에 만료됩니다
                </span>
              </div>
            </div>

            {/* 만료일별 상세 정보 */}
            <div className="space-y-1">
              {Object.entries(expiringData.pointsByDate)
                .slice(0, 3) // 최대 3개까지만 표시
                .map(([date, points]) => {
                  const totalPoints = points.reduce((sum, p) => sum + p.remaining_points, 0);
                  const expirationDate = points[0]?.expiration_date;
                  
                  return (
                    <div key={date} className="text-xs flex items-center justify-between">
                      <span>{formatDate(expirationDate)}</span>
                      <span className="font-medium">{totalPoints.toLocaleString()}P</span>
                    </div>
                  );
                })}
              
              {Object.keys(expiringData.pointsByDate).length > 3 && (
                <div className="text-xs text-gray-600">
                  외 {Object.keys(expiringData.pointsByDate).length - 3}건 더...
                </div>
              )}
            </div>

            {urgencyLevel === 'critical' && (
              <div className="mt-2 text-xs font-medium">
                💡 포인트를 사용하여 리포트를 생성하거나 충전을 고려해보세요.
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="알림 닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ExpiringPointsAlert;