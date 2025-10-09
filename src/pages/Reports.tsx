import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '../components/UI/Card'
import Button from '../components/UI/Button'
import { 
  FileText, 
  Download, 
  Search, 
  Filter,
  Calendar,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { activityTracker } from '../lib/activityTracker'
import { cn } from '../lib/utils'
import { getApiUrl } from '../lib/api'

interface Report {
  id: string
  title: string
  application_number: string
  created_at: string
  downloadUrl: string
}

interface ReportsResponse {
  reports: Report[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    limit: number
  }
  filters: {
    days: number
    sortBy: string
    sortOrder: string
    search: string
    startDate?: string
    endDate?: string
  }
}

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20
  })
  
  // 필터 상태
  const [filters, setFilters] = useState({
    days: 100,
    sortBy: 'created_at',
    sortOrder: 'desc',
    search: '',
    startDate: '',
    endDate: ''
  })
  
  const [currentPage, setCurrentPage] = useState(1)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  // 리포트 데이터 로드
  const loadReports = async (page = 1) => {
    if (!user?.id) {
      setError('로그인이 필요합니다.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        userId: user.id,
        page: page.toString(),
        limit: pagination.limit.toString(),
        days: filters.days.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      })

      const apiUrl = getApiUrl(`/api/users/reports?${params}`);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ReportsResponse = await response.json()
      
      setReports(data.reports || [])
      setPagination(data.pagination)
      setCurrentPage(page)
      
    } catch (error) {
      console.error('Failed to load reports:', error)
      setError('리포트를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 사용자 ID 설정
  useEffect(() => {
    if (user?.id) {
      activityTracker.setUserId(user.id)
    }
  }, [user?.id])

  // 초기 로드
  useEffect(() => {
    loadReports(1)
  }, [user, filters])

  // 필터 변경 핸들러
  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
    
    // 필터 변경 활동 추적
    if (user?.id) {
      activityTracker.trackFilterChange({ [key]: value }, filters)
    }
  }

  // 정렬 변경 핸들러
  const handleSortChange = (sortBy: string) => {
    const newSortOrder = filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc'
    setFilters(prev => ({ ...prev, sortBy, sortOrder: newSortOrder }))
    
    // 정렬 변경 활동 추적
    if (user?.id) {
      activityTracker.trackFilterChange({ sort: `${sortBy}_${newSortOrder}` }, { sortBy, sortOrder: newSortOrder })
    }
  }

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      loadReports(page)
      
      // 페이지 변경 활동 추적
      if (user?.id) {
        activityTracker.trackPageNavigation(`/reports?page=${page}`, 'reports')
      }
    }
  }

  // 다운로드 핸들러
  const handleDownload = async (report: Report) => {
    try {
      // 사용자 활동 추적 - 보고서 다운로드
      if (user?.id) {
        activityTracker.trackDocumentDownload(
          report.application_number || 'unknown',
          'ai_analysis_report',
          0 // 파일 크기는 알 수 없음
        )
      }
    } catch (error) {
      console.error('보고서 다운로드 활동 추적 오류:', error)
      // 활동 추적 실패는 다운로드 기능에 영향을 주지 않음
    }
    
    window.open(report.downloadUrl, '_blank')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">로그인 필요</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">리포트를 보려면 로그인이 필요합니다.</p>
          <Button 
            onClick={() => navigate('/login')}
            className="bg-ms-olive hover:bg-ms-olive/90 text-white"
          >
            로그인하기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            모든 리포트
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            최근 {filters.days}일간 생성된 AI 분석 리포트를 확인하고 다운로드하세요.
          </p>
        </div>

        {/* 필터 및 검색 */}
        <Card className="border-ms-line dark:border-secondary-700 bg-white dark:bg-dark-800 mb-6">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Filter className="h-5 w-5 text-ms-olive dark:text-ms-olive" />
              필터 및 검색
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 기간 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  조회 기간
                </label>
                <select
                  value={filters.days}
                  onChange={(e) => handleFilterChange('days', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-ms-line dark:border-dark-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ms-olive focus:border-ms-olive"
                >
                  <option value={7}>최근 7일</option>
                  <option value={30}>최근 30일</option>
                  <option value={100}>최근 100일</option>
                  <option value={365}>최근 1년</option>
                </select>
              </div>

              {/* 정렬 기준 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  정렬 기준
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="w-full px-3 py-2 border border-ms-line dark:border-dark-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ms-olive focus:border-ms-olive"
                >
                  <option value="created_at">생성일</option>
                  <option value="title">제목</option>
                </select>
              </div>

              {/* 정렬 순서 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  정렬 순서
                </label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            className="w-full px-3 py-2 border border-ms-line dark:border-dark-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ms-olive focus:border-ms-olive"
                >
                  <option value="desc">내림차순</option>
                  <option value="asc">오름차순</option>
                </select>
              </div>

              {/* 검색 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  검색
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="리포트 제목 검색..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-ms-line dark:border-dark-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ms-olive focus:border-ms-olive"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 리포트 목록 */}
        <Card className="border-ms-line dark:border-secondary-700 bg-white dark:bg-dark-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                리포트 목록
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                총 {pagination.totalCount}개의 리포트
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-ms-olive dark:text-ms-olive" />
                <span className="ml-2 text-gray-600 dark:text-gray-300">리포트를 불러오는 중...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                <Button 
                  onClick={() => loadReports(currentPage)}
                  className="bg-ms-olive hover:bg-ms-olive/90 text-white"
                >
                  다시 시도
                </Button>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">리포트가 없습니다</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">AI 분석을 통해 리포트를 생성해보세요.</p>
              </div>
            ) : (
              <>
                {/* 테이블 헤더 */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b-2 border-ms-line dark:border-secondary-700">
                  <div 
                    className="col-span-5 flex items-center gap-2 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                    onClick={() => handleSortChange('title')}
                  >
                    리포트 제목
                    {filters.sortBy === 'title' && (
                      filters.sortOrder === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />
                    )}
                  </div>
                  <div className="col-span-3">출원번호</div>
                  <div 
                    className="col-span-3 flex items-center gap-2 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                    onClick={() => handleSortChange('created_at')}
                  >
                    생성일
                    {filters.sortBy === 'created_at' && (
                      filters.sortOrder === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />
                    )}
                  </div>
                  <div className="col-span-1 text-center">다운로드</div>
                </div>

                {/* 리포트 목록 */}
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div 
                      key={report.id} 
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {/* 모바일 레이아웃 */}
                      <div className="md:hidden space-y-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">{report.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(report.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                        {report.application_number && (
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            출원번호: {report.application_number}
                          </div>
                        )}
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(report)}
                            className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            다운로드
                          </Button>
                        </div>
                      </div>

                      {/* 데스크톱 레이아웃 */}
                      <div className="hidden md:contents">
                        <div className="col-span-5">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate" title={report.title}>
                            {report.title}
                          </h3>
                        </div>
                        <div className="col-span-3 text-gray-600 dark:text-gray-300 truncate">
                          {report.application_number || '-'}
                        </div>
                        <div className="col-span-3 text-gray-600 dark:text-gray-300">
                          {new Date(report.created_at).toLocaleDateString('ko-KR')}
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(report)}
                            className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                            title="다운로드"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 페이지네이션 */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t-2 border-ms-line dark:border-secondary-700">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {((pagination.currentPage - 1) * pagination.limit) + 1}-{Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} / {pagination.totalCount}개
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage <= 1}
                        className="border-gray-300 dark:border-gray-600"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      {/* 페이지 번호 */}
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.currentPage - 2)) + i
                        if (pageNum > pagination.totalPages) return null
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === pagination.currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className={cn(
                              "border-gray-300 dark:border-gray-600",
                              pageNum === pagination.currentPage && "bg-ms-olive text-white border-ms-olive"
                            )}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage >= pagination.totalPages}
                        className="border-gray-300 dark:border-gray-600"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}