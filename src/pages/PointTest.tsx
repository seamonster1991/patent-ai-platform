import React, { useState, useEffect } from 'react';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { Input } from '../components/UI/Input';
import { Label } from '../components/UI/Label';
import { supabase } from '../lib/supabase';

interface PointTransaction {
  id: string;
  type: string;
  amount: number;
  expires_at: string;
  created_at: string;
  report_type?: string;
}

interface PointBalance {
  current_balance: number;
  last_updated: string;
}

const PointTest: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [pointBalance, setPointBalance] = useState<PointBalance | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [deductAmount, setDeductAmount] = useState(150);

  useEffect(() => {
    // 현재 로그인된 사용자 확인
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await loadPointData(user.id);
      }
    };
    checkUser();
  }, []);

  const loadPointData = async (userId: string) => {
    try {
      setLoading(true);
      
      // 포인트 잔액 조회
      const balanceResponse = await fetch(`/api/points?action=balance&userId=${userId}`);
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setPointBalance(balanceData);
      }

      // 거래 내역 조회
      const transactionsResponse = await fetch(`/api/points?action=transactions&userId=${userId}`);
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData);
      }
    } catch (error) {
      console.error('포인트 데이터 로드 실패:', error);
      setMessage('포인트 데이터 로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const setupTestData = async () => {
    if (!user) {
      setMessage('로그인이 필요합니다.');
      return;
    }

    try {
      setLoading(true);
      setMessage('테스트 데이터 설정 중...');

      // 기존 포인트 데이터 삭제 (테스트용)
      await fetch('/api/points/clear-test-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      // 테스트 포인트 데이터 생성
      const testData = [
        { amount: 100, daysFromNow: 5 },   // 5일 후 만료
        { amount: 150, daysFromNow: 15 },  // 15일 후 만료
        { amount: 100, daysFromNow: 25 }   // 25일 후 만료
      ];

      for (const data of testData) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + data.daysFromNow);
        
        await fetch('/api/points/add-test-points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            amount: data.amount,
            expiresAt: expiresAt.toISOString()
          })
        });
      }

      await loadPointData(user.id);
      setMessage('테스트 데이터가 설정되었습니다. (총 350포인트)');
    } catch (error) {
      console.error('테스트 데이터 설정 실패:', error);
      setMessage('테스트 데이터 설정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const testPointDeduction = async () => {
    if (!user) {
      setMessage('로그인이 필요합니다.');
      return;
    }

    try {
      setLoading(true);
      setMessage(`${deductAmount}포인트 차감 테스트 중...`);

      const response = await fetch('/api/points?action=deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: deductAmount,
          reportType: 'test_report',
          requestId: `test_${Date.now()}`
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(`✅ ${deductAmount}포인트가 성공적으로 차감되었습니다. 남은 잔액: ${result.remainingBalance}포인트`);
        await loadPointData(user.id);
      } else {
        setMessage(`❌ 포인트 차감 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('포인트 차감 실패:', error);
      setMessage('포인트 차감에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const testPointCharge = async () => {
    if (!user) {
      setMessage('로그인이 필요합니다.');
      return;
    }

    try {
      setLoading(true);
      setMessage('포인트 충전 테스트 중...');

      const response = await fetch('/api/billing/charge-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amountKrw: 10000,
          paymentType: 'addon',
          paymentId: `test_payment_${Date.now()}`
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(`✅ 포인트 충전 성공! 기본: ${result.basePoints}P, 보너스: ${result.bonusPoints}P, 총: ${result.totalPoints}P`);
        await loadPointData(user.id);
      } else {
        setMessage(`❌ 포인트 충전 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('포인트 충전 실패:', error);
      setMessage('포인트 충전에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'testpassword123'
      });
      
      if (error) {
        setMessage(`로그인 실패: ${error.message}`);
      } else {
        setUser(data.user);
        setMessage('로그인 성공!');
        if (data.user) {
          await loadPointData(data.user.id);
        }
      }
    } catch (error) {
      console.error('로그인 실패:', error);
      setMessage('로그인에 실패했습니다.');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-olive-800">포인트 시스템 테스트</h1>
      
      {/* 사용자 정보 */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">사용자 정보</h2>
        {user ? (
          <div>
            <p><strong>사용자 ID:</strong> {user.id}</p>
            <p><strong>이메일:</strong> {user.email}</p>
          </div>
        ) : (
          <div>
            <p className="mb-4">로그인이 필요합니다.</p>
            <Button onClick={signInWithEmail} className="bg-olive-600 hover:bg-olive-700">
              테스트 계정으로 로그인
            </Button>
          </div>
        )}
      </Card>

      {user && (
        <>
          {/* 포인트 잔액 */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">현재 포인트 잔액</h2>
            {pointBalance ? (
              <div>
                <p className="text-2xl font-bold text-olive-600">
                  {pointBalance.current_balance.toLocaleString()}P
                </p>
                <p className="text-sm text-gray-500">
                  마지막 업데이트: {new Date(pointBalance.last_updated).toLocaleString()}
                </p>
              </div>
            ) : (
              <p>포인트 잔액을 불러오는 중...</p>
            )}
          </Card>

          {/* 테스트 컨트롤 */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">테스트 컨트롤</h2>
            <div className="space-y-4">
              <Button 
                onClick={setupTestData} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 mr-4"
              >
                테스트 데이터 설정 (350P)
              </Button>
              
              <div className="flex items-center space-x-4">
                <Label htmlFor="deductAmount">차감할 포인트:</Label>
                <Input
                  id="deductAmount"
                  type="number"
                  value={deductAmount}
                  onChange={(e) => setDeductAmount(Number(e.target.value))}
                  className="w-32"
                />
                <Button 
                  onClick={testPointDeduction} 
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  FEFO 차감 테스트
                </Button>
              </div>
              
              <Button 
                onClick={testPointCharge} 
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                포인트 충전 테스트 (10,000원)
              </Button>
            </div>
            
            {message && (
              <div className="mt-4 p-3 bg-gray-100 rounded-md">
                <p>{message}</p>
              </div>
            )}
          </Card>

          {/* 거래 내역 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">거래 내역</h2>
            {transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-2 text-left">타입</th>
                      <th className="border border-gray-300 p-2 text-left">금액</th>
                      <th className="border border-gray-300 p-2 text-left">만료일</th>
                      <th className="border border-gray-300 p-2 text-left">생성일</th>
                      <th className="border border-gray-300 p-2 text-left">리포트 타입</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="border border-gray-300 p-2">{transaction.type}</td>
                        <td className={`border border-gray-300 p-2 ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}P
                        </td>
                        <td className="border border-gray-300 p-2">
                          {new Date(transaction.expires_at).toLocaleDateString()}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </td>
                        <td className="border border-gray-300 p-2">{transaction.report_type || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>거래 내역이 없습니다.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default PointTest;