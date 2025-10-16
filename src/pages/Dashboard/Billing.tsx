import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  CreditCardIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  SparklesIcon,
  TrophyIcon,
  RocketLaunchIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { 
  Card, 
  Text, 
  Title, 
  Grid, 
  Col,
  Metric,
  Flex,
  Badge,
  Button,
  ProgressBar,
  Select,
  SelectItem,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell
} from '@tremor/react'
import { useAuthStore } from '../../store/authStore'
import { toast } from 'sonner'

// Types
interface SubscriptionInfo {
  plan: string
  status: string
  credits: number
  maxCredits: number
  nextBillingDate: string
  monthlyUsage: number
  features: string[]
}

interface CreditPackage {
  id: string
  name: string
  credits: number
  bonusCredits: number
  price: number
  popular: boolean
  description: string
}

interface BillingHistory {
  id: string
  date: string
  description: string
  amount: number
  status: string
  credits: number
}

interface UsageCost {
  date: string
  searchCost: number
  reportCost: number
  viewCost: number
  total: number
}

export default function BillingManagement() {
  const { user } = useAuthStore()
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([])
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([])
  const [usageCosts, setUsageCosts] = useState<UsageCost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('100d')
  const [processingPayment, setProcessingPayment] = useState<string | null>(null)

  // Mock data for development
  const mockSubscriptionInfo: SubscriptionInfo = {
    plan: 'Premium',
    status: 'active',
    credits: 750,
    maxCredits: 1000,
    nextBillingDate: '2024-02-15',
    monthlyUsage: 250,
    features: [
      '월 1,000 크레딧',
      '무제한 검색',
      '고급 분석 리포트',
      '우선 고객 지원',
      'API 액세스'
    ]
  }

  const mockCreditPackages: CreditPackage[] = [
    {
      id: 'starter',
      name: '스타터 팩',
      credits: 100,
      bonusCredits: 10,
      price: 9900,
      popular: false,
      description: '소규모 프로젝트에 적합'
    },
    {
      id: 'professional',
      name: '프로페셔널 팩',
      credits: 500,
      bonusCredits: 75,
      price: 39900,
      popular: true,
      description: '중간 규모 연구에 최적'
    },
    {
      id: 'enterprise',
      name: '엔터프라이즈 팩',
      credits: 1000,
      bonusCredits: 200,
      price: 69900,
      popular: false,
      description: '대규모 분석 프로젝트용'
    },
    {
      id: 'unlimited',
      name: '언리미티드 팩',
      credits: 2500,
      bonusCredits: 500,
      price: 149900,
      popular: false,
      description: '무제한 사용을 위한 최고 패키지'
    }
  ]

  const mockBillingHistory: BillingHistory[] = [
    {
      id: '1',
      date: '2024-01-15',
      description: 'Premium 월간 구독',
      amount: 29900,
      status: 'completed',
      credits: 1000
    },
    {
      id: '2',
      date: '2024-01-10',
      description: '프로페셔널 팩 구매',
      amount: 39900,
      status: 'completed',
      credits: 575
    },
    {
      id: '3',
      date: '2023-12-15',
      description: 'Premium 월간 구독',
      amount: 29900,
      status: 'completed',
      credits: 1000
    }
  ]

  const mockUsageCosts: UsageCost[] = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
    return {
      date: date.toISOString().split('T')[0],
      searchCost: Math.floor(Math.random() * 50) + 10,
      reportCost: Math.floor(Math.random() * 100) + 20,
      viewCost: Math.floor(Math.random() * 30) + 5,
      total: 0
    }
  }).map(item => ({
    ...item,
    total: item.searchCost + item.reportCost + item.viewCost
  }))

  useEffect(() => {
    const fetchBillingData = async () => {
      if (!user?.id) return

      try {
        setLoading(true)
        setError(null)

        // 실제 API 호출로 변경
        const [subscriptionResponse, paymentsResponse, usageResponse] = await Promise.all([
          // 구독 정보 조회
          fetch('/api/billing?action=subscription-info', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }),
          // 결제 내역 조회
          fetch('/api/payment/history', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }),
          // 사용량 조회
          fetch('/api/points?action=usage-history', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
        ])

        // 구독 정보 처리
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json()
          setSubscriptionInfo({
            plan: subscriptionData.plan || 'Free',
            status: subscriptionData.status || 'active',
            credits: subscriptionData.credits || 0,
            maxCredits: subscriptionData.maxCredits || 1000,
            nextBillingDate: subscriptionData.nextBillingDate || '2024-02-15',
            monthlyUsage: subscriptionData.monthlyUsage || 0,
            features: subscriptionData.features || [
              '월 1,000 크레딧',
              '무제한 검색',
              '고급 분석 리포트',
              '우선 고객 지원',
              'API 액세스'
            ]
          })
        } else {
          // 기본값 설정
          setSubscriptionInfo({
            plan: 'Free',
            status: 'active',
            credits: 0,
            maxCredits: 100,
            nextBillingDate: '2024-02-15',
            monthlyUsage: 0,
            features: ['월 100 크레딧', '기본 검색']
          })
        }

        // 결제 내역 처리
        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json()
          setBillingHistory(paymentsData.payments || [])
        } else {
          setBillingHistory([])
        }

        // 사용량 처리
        if (usageResponse.ok) {
          const usageData = await usageResponse.json()
          setUsageCosts(usageData.usage || [])
        } else {
          // 기본 사용량 데이터
          setUsageCosts(Array.from({ length: 30 }, (_, i) => {
            const date = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
            return {
              date: date.toISOString().split('T')[0],
              searchCost: 0,
              reportCost: 0,
              viewCost: 0,
              total: 0
            }
          }))
        }

        // 크레딧 패키지는 정적 데이터로 유지
        setCreditPackages([
          {
            id: 'starter',
            name: '스타터 팩',
            credits: 100,
            bonusCredits: 10,
            price: 9900,
            popular: false,
            description: '소규모 프로젝트에 적합'
          },
          {
            id: 'professional',
            name: '프로페셔널 팩',
            credits: 500,
            bonusCredits: 75,
            price: 39900,
            popular: true,
            description: '중간 규모 연구에 최적'
          },
          {
            id: 'enterprise',
            name: '엔터프라이즈 팩',
            credits: 1000,
            bonusCredits: 200,
            price: 69900,
            popular: false,
            description: '대규모 분석 프로젝트용'
          },
          {
            id: 'unlimited',
            name: '언리미티드 팩',
            credits: 2500,
            bonusCredits: 500,
            price: 149900,
            popular: false,
            description: '무제한 사용을 위한 최고 패키지'
          }
        ])

        setLoading(false)

      } catch (error) {
        console.error('Billing data fetch error:', error)
        setError(error instanceof Error ? error.message : 'Unknown error occurred')
        toast.error('결제 정보를 불러오는데 실패했습니다.')
        setLoading(false)
      }
    }

    fetchBillingData()
  }, [user?.id])

  const handlePurchaseCredits = async (packageId: string) => {
    try {
      setProcessingPayment(packageId)
      
      const selectedPackage = creditPackages.find(pkg => pkg.id === packageId)
      if (!selectedPackage) {
        throw new Error('선택한 패키지를 찾을 수 없습니다.')
      }

      // 실제 결제 API 호출
      const response = await fetch('/api/billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'charge-points',
          amount_krw: selectedPackage.price,
          payment_type: 'addon',
          payment_id: `pkg_${packageId}_${Date.now()}`,
          package_id: packageId
        })
      })

      if (!response.ok) {
        throw new Error('결제 처리에 실패했습니다.')
      }

      const result = await response.json()
      
      if (result.success && subscriptionInfo) {
        const totalCredits = selectedPackage.credits + selectedPackage.bonusCredits
        setSubscriptionInfo({
          ...subscriptionInfo,
          credits: subscriptionInfo.credits + totalCredits
        })
        
        toast.success(`${selectedPackage.name} 구매가 완료되었습니다! ${totalCredits} 크레딧이 추가되었습니다.`)
      } else {
        throw new Error(result.error || '결제 처리에 실패했습니다.')
      }
      
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessingPayment(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge color="emerald">활성</Badge>
      case 'completed':
        return <Badge color="emerald">완료</Badge>
      case 'pending':
        return <Badge color="yellow">대기중</Badge>
      case 'failed':
        return <Badge color="red">실패</Badge>
      default:
        return <Badge color="gray">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <Text>결제 정보를 불러오는 중...</Text>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Text className="text-red-600 mb-4">{error}</Text>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  const creditUsagePercentage = subscriptionInfo ? (subscriptionInfo.credits / subscriptionInfo.maxCredits) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link 
              to="/dashboard" 
              className="mr-4 p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-semibold text-gray-800">결제 관리</h1>
              <Text className="text-gray-600">구독 정보, 크레딧 충전 및 사용 내역</Text>
            </div>
          </div>
        </div>

        {/* Current Subscription */}
        <Card className="mb-8 p-6">
          <div className="flex items-center justify-between mb-6">
            <Title className="text-gray-800">현재 구독 정보</Title>
            {getStatusBadge(subscriptionInfo?.status || '')}
          </div>
          
          <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-6 mb-6">
            <div>
              <Text className="text-gray-600 mb-1">구독 플랜</Text>
              <Metric className="text-gray-800">{subscriptionInfo?.plan}</Metric>
            </div>
            <div>
              <Text className="text-gray-600 mb-1">보유 크레딧</Text>
              <Metric className="text-gray-800">{subscriptionInfo?.credits?.toLocaleString()}</Metric>
              <Text className="text-gray-500 text-sm">/ {subscriptionInfo?.maxCredits?.toLocaleString()}</Text>
            </div>
            <div>
              <Text className="text-gray-600 mb-1">이번 달 사용량</Text>
              <Metric className="text-gray-800">{subscriptionInfo?.monthlyUsage?.toLocaleString()}</Metric>
              <Text className="text-gray-500 text-sm">크레딧</Text>
            </div>
            <div>
              <Text className="text-gray-600 mb-1">다음 결제일</Text>
              <Metric className="text-gray-800">{formatDate(subscriptionInfo?.nextBillingDate || '')}</Metric>
            </div>
          </Grid>

          {/* Credit Usage Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <Text className="text-gray-600">크레딧 사용률</Text>
              <Text className="text-gray-800 font-medium">{creditUsagePercentage.toFixed(1)}%</Text>
            </div>
            <ProgressBar 
              value={creditUsagePercentage} 
              color={creditUsagePercentage > 80 ? "red" : creditUsagePercentage > 60 ? "yellow" : "emerald"}
              className="mb-2"
            />
            {creditUsagePercentage > 80 && (
              <div className="flex items-center text-red-600 text-sm">
                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                크레딧이 부족합니다. 추가 충전을 고려해보세요.
              </div>
            )}
          </div>

          {/* Features */}
          <div>
            <Text className="text-gray-600 mb-3">포함된 기능</Text>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {subscriptionInfo?.features.map((feature, index) => (
                <div key={index} className="flex items-center text-gray-700">
                  <CheckCircleIcon className="h-4 w-4 text-emerald-500 mr-2" />
                  <Text>{feature}</Text>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Credit Packages */}
        <Card className="mb-8 p-6">
          <Title className="text-gray-800 mb-2">크레딧 충전</Title>
          <Text className="text-gray-600 mb-6">필요에 맞는 크레딧 패키지를 선택하세요</Text>
          
          <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-6">
            {creditPackages.map((pkg) => (
              <Card key={pkg.id} className={`p-6 relative ${pkg.popular ? 'ring-2 ring-blue-500' : ''}`}>
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge color="blue" className="px-3 py-1">
                      <StarIcon className="h-3 w-3 mr-1" />
                      인기
                    </Badge>
                  </div>
                )}
                
                <div className="text-center mb-4">
                  <div className="mb-2">
                    {pkg.id === 'starter' && <SparklesIcon className="h-8 w-8 text-blue-500 mx-auto" />}
                    {pkg.id === 'professional' && <TrophyIcon className="h-8 w-8 text-emerald-500 mx-auto" />}
                    {pkg.id === 'enterprise' && <RocketLaunchIcon className="h-8 w-8 text-purple-500 mx-auto" />}
                    {pkg.id === 'unlimited' && <StarIcon className="h-8 w-8 text-yellow-500 mx-auto" />}
                  </div>
                  <Title className="text-gray-800 mb-1">{pkg.name}</Title>
                  <Text className="text-gray-600 text-sm mb-3">{pkg.description}</Text>
                  <Metric className="text-gray-800 mb-1">{formatCurrency(pkg.price)}</Metric>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between">
                    <Text className="text-gray-600">기본 크레딧</Text>
                    <Text className="text-gray-800 font-medium">{pkg.credits.toLocaleString()}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text className="text-emerald-600">보너스 크레딧</Text>
                    <Text className="text-emerald-600 font-medium">+{pkg.bonusCredits.toLocaleString()}</Text>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between">
                    <Text className="text-gray-800 font-medium">총 크레딧</Text>
                    <Text className="text-gray-800 font-bold">{(pkg.credits + pkg.bonusCredits).toLocaleString()}</Text>
                  </div>
                </div>

                <Button
                  onClick={() => handlePurchaseCredits(pkg.id)}
                  loading={processingPayment === pkg.id}
                  className="w-full"
                  color={pkg.popular ? "blue" : "gray"}
                >
                  {processingPayment === pkg.id ? '처리 중...' : '구매하기'}
                </Button>
              </Card>
            ))}
          </Grid>
        </Card>

        {/* Billing History */}
        <Card className="mb-8 p-6">
          <div className="flex items-center justify-between mb-6">
            <Title className="text-gray-800">결제 내역</Title>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectItem value="30d">최근 30일</SelectItem>
              <SelectItem value="90d">최근 90일</SelectItem>
              <SelectItem value="1y">최근 1년</SelectItem>
            </Select>
          </div>
          
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>날짜</TableHeaderCell>
                <TableHeaderCell>설명</TableHeaderCell>
                <TableHeaderCell>금액</TableHeaderCell>
                <TableHeaderCell>크레딧</TableHeaderCell>
                <TableHeaderCell>상태</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {billingHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{formatDate(item.date)}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{formatCurrency(item.amount)}</TableCell>
                  <TableCell>+{item.credits.toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Usage Summary */}
        <Card className="p-6">
          <Title className="text-gray-800 mb-2">사용량 요약</Title>
          <Text className="text-gray-600 mb-6">최근 30일간 크레딧 사용 패턴</Text>
          
          <Grid numItems={1} numItemsSm={3} className="gap-6 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center mb-2">
                <BanknotesIcon className="h-5 w-5 text-blue-500 mr-2" />
                <Text className="text-blue-800 font-medium">검색 비용</Text>
              </div>
              <Metric className="text-blue-800">
                {usageCosts.reduce((sum, item) => sum + item.searchCost, 0).toLocaleString()}
              </Metric>
              <Text className="text-blue-600 text-sm">크레딧</Text>
            </div>
            
            <div className="p-4 bg-emerald-50 rounded-lg">
              <div className="flex items-center mb-2">
                <CreditCardIcon className="h-5 w-5 text-emerald-500 mr-2" />
                <Text className="text-emerald-800 font-medium">리포트 비용</Text>
              </div>
              <Metric className="text-emerald-800">
                {usageCosts.reduce((sum, item) => sum + item.reportCost, 0).toLocaleString()}
              </Metric>
              <Text className="text-emerald-600 text-sm">크레딧</Text>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center mb-2">
                <ClockIcon className="h-5 w-5 text-purple-500 mr-2" />
                <Text className="text-purple-800 font-medium">조회 비용</Text>
              </div>
              <Metric className="text-purple-800">
                {usageCosts.reduce((sum, item) => sum + item.viewCost, 0).toLocaleString()}
              </Metric>
              <Text className="text-purple-600 text-sm">크레딧</Text>
            </div>
          </Grid>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <Text className="text-gray-800 font-medium">총 사용 크레딧 (30일)</Text>
              <Metric className="text-gray-800">
                {usageCosts.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
              </Metric>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link to="/dashboard">
            <button className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center">
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              대시보드로 돌아가기
            </button>
          </Link>
          <Link to="/dashboard/activity">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              활동 분석 보기
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}