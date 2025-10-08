import { useState, useEffect } from 'react'
import { CreditCard, Calendar, DollarSign, TrendingUp, Gift, AlertCircle } from 'lucide-react'
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card'
import { useAuthStore } from '../store/authStore'
import { formatDate } from '../lib/utils'
import { activityTracker } from '../lib/activityTracker'

export default function Billing() {
  const { user } = useAuthStore()

  // 사용자 ID 설정
  useEffect(() => {
    if (user?.id) {
      activityTracker.setUserId(user.id)
      // 결제정보 페이지 방문 추적
      activityTracker.trackPageView('billing')
    }
  }, [user?.id])

  // 결제 정보 데이터 (실제 환경에서는 API에서 가져와야 함)
  const billingData = {
    subscription: {
      tier: 'Free',
      plan: '-'
    },
    credits: {
      current: 750,
      limit: 10000
    },
    usage: {
      currentMonth: 0,
      monthlyLimit: 10000,
      nextPayment: 10000,
      nextPaymentWithTax: 11000,
      nextPaymentDate: null
    },
    renewal: {
      renewalDate: null,
      expiryDate: '2024-02-15'
    },
    bonus: {
      policy: '10,000원 이상 충전 시 10% 보너스 크레딧',
      progress: 0,
      progressLimit: 10000,
      expiryDate: '2024-02-15'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원'
  }

  const formatProgress = (current: number, total: number) => {
    return Math.round((current / total) * 100)
  }

  return (
    <div className="min-h-screen bg-ms-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ms-primary mb-2">결제정보</h1>
          <p className="text-ms-secondary">구독 및 크레딧 사용 현황을 확인하세요</p>
        </div>

        <div className="space-y-6">
          {/* 구독 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-ms-olive" />
                <span>구독 및 크레딧</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 현재 구독 등급 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-ms-secondary">현재 구독 등급</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-ms-primary">{billingData.subscription.tier}</span>
                    <span className="px-2 py-1 bg-ms-soft text-ms-secondary text-xs rounded-full">
                      플랜: {billingData.subscription.plan}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-ms-secondary">보유 크레딧</h3>
                  <div className="text-2xl font-bold text-ms-olive">
                    {billingData.credits.current.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 금액 기준 사용률 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-ms-olive" />
                <span>금액 기준 사용률</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ms-secondary">이번 달 사용 금액</span>
                  <span className="text-sm font-medium text-ms-primary">
                    {formatCurrency(billingData.usage.currentMonth)} / {formatCurrency(billingData.usage.monthlyLimit)}
                  </span>
                </div>
                <div className="w-full bg-ms-soft rounded-full h-2">
                  <div 
                    className="bg-ms-olive h-2 rounded-full transition-all duration-300"
                    style={{ width: `${formatProgress(billingData.usage.currentMonth, billingData.usage.monthlyLimit)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-ms-soft">
                <div className="space-y-1">
                  <p className="text-sm text-ms-secondary">다음 결제 정보</p>
                  <p className="text-sm font-medium text-ms-primary">
                    월 {formatCurrency(billingData.usage.nextPayment)} / 부가세 포함 {formatCurrency(billingData.usage.nextPaymentWithTax)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-ms-secondary">다음 결제일</p>
                  <p className="text-sm font-medium text-ms-primary">
                    {billingData.usage.nextPaymentDate || '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 크레딧 기준 사용률 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-ms-olive" />
                <span>크레딧 기준 사용률</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ms-secondary">현재 크레딧 / 크레딧 한도(구독 결제 기준)</span>
                  <span className="text-sm font-medium text-ms-primary">
                    {billingData.credits.current.toLocaleString()} / {billingData.credits.limit.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-ms-soft rounded-full h-2">
                  <div 
                    className="bg-ms-olive h-2 rounded-full transition-all duration-300"
                    style={{ width: `${formatProgress(billingData.credits.current, billingData.credits.limit)}%` }}
                  />
                </div>
                <div className="text-xs text-ms-muted">
                  {formatProgress(billingData.credits.current, billingData.credits.limit)}% 사용 중
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-ms-soft">
                <div className="space-y-1">
                  <p className="text-sm text-ms-secondary">갱신일</p>
                  <p className="text-sm font-medium text-ms-primary">
                    {billingData.renewal.renewalDate || '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-ms-secondary">만료일</p>
                  <p className="text-sm font-medium text-ms-primary">
                    {billingData.renewal.expiryDate}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 추가 충전 및 보너스 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Gift className="w-5 h-5 text-ms-olive" />
                <span>추가 충전 및 보너스</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3 p-3 bg-ms-soft rounded-lg">
                <AlertCircle className="w-5 h-5 text-ms-olive mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-ms-primary">보너스 정책</p>
                  <p className="text-sm text-ms-secondary">{billingData.bonus.policy}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ms-secondary">보너스 진행률(금액 기준)</span>
                  <span className="text-sm font-medium text-ms-primary">
                    {formatCurrency(billingData.bonus.progress)} / {formatCurrency(billingData.bonus.progressLimit)} (결제 시 설정 한도)
                  </span>
                </div>
                <div className="w-full bg-ms-soft rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-ms-olive to-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${formatProgress(billingData.bonus.progress, billingData.bonus.progressLimit)}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-ms-soft">
                <div className="space-y-1">
                  <p className="text-sm text-ms-secondary">보너스 만료일</p>
                  <p className="text-sm font-medium text-ms-primary">
                    {billingData.bonus.expiryDate}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 결제 관리 버튼들 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <button className="flex-1 px-4 py-2 bg-ms-olive text-white rounded-lg hover:bg-ms-olive/90 transition-colors font-medium">
                  크레딧 충전
                </button>
                <button className="flex-1 px-4 py-2 border border-ms-line text-ms-primary rounded-lg hover:bg-ms-soft transition-colors font-medium">
                  구독 변경
                </button>
                <button className="flex-1 px-4 py-2 border border-ms-line text-ms-primary rounded-lg hover:bg-ms-soft transition-colors font-medium">
                  결제 내역
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}