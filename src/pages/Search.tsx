import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, Filter, Calendar, Building, FileText, TrendingUp, ChevronLeft, ChevronRight, Settings, X, Plus, Hash, User } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import Button from '../components/UI/Button'
import Input from '../components/UI/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card'
import Loading from '../components/UI/Loading'
import ErrorMessage from '../components/UI/ErrorMessage'
import { useSearchStore } from '../store/searchStore'
import { useAuthStore } from '../store/authStore'
import { formatDate, truncateText, cn } from '../lib/utils'
import { toast } from 'sonner'


export default function Search() {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'number' | 'date' | 'person'>('basic')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const { user } = useAuthStore()
  const {
    filters,
    results,
    loading,
    error,
    totalCount,
    currentPage,
    setFilters,
    searchPatents,
    clearResults,
    resetFilters,
    loadSearchState
  } = useSearchStore()

  console.log('🔐 Search 페이지 - 사용자 인증 상태:', { user: !!user, userEmail: user?.email })
  console.log('🔐 Search 페이지 - 전체 사용자 객체:', user)
  console.log('🔍 [Search] 현재 검색 스토어 상태:', { totalCount, resultsLength: results.length, currentPage, filters })

  useEffect(() => {
    // URL 파라미터에서 검색어 확인
    const queryFromUrl = searchParams.get('q')
    
    if (queryFromUrl) {
      // URL에서 온 검색어가 있으면 모든 상태를 초기화하고 새로운 검색 실행
      resetFilters()
      clearResults()
      
      // 새로운 검색어로 필터 설정
      setFilters({ word: queryFromUrl })
      
      // 다음 렌더링 사이클에서 검색 실행
      setTimeout(() => {
        searchPatents(1).then(({ error }) => {
          if (error) {
            toast.error(error)
          }
        })
      }, 0)
    } else {
      // URL 파라미터가 없으면 기존 로직 실행
      const stateRestored = loadSearchState()
      
      // 상태가 복원되지 않았고 검색어가 있다면 자동 검색 실행
      if (stateRestored === false) {
        const hasSearchTerm = filters.word || filters.inventionTitle || filters.keyword
        if (hasSearchTerm) {
          setTimeout(() => {
            searchPatents(1).then(({ error }) => {
              if (error) {
                toast.error(error)
              }
            })
          }, 0)
        }
      }
    }
  }, [searchParams])

  const handleSearch = async (page = 1) => {
    console.log('🔍 [Search] 검색 시작:', { page, currentTotalCount: totalCount });
    const { error } = await searchPatents(page)
    if (error) {
      toast.error(error)
    } else {
      console.log('✅ [Search] 검색 완료:', { 
        resultsLength: results.length, 
        totalCount, 
        currentPage 
      });
    }
  }

  const handleFilterChange = (field: string, value: string | boolean | number) => {
    setFilters({ [field]: value })
  }

  const handleClearFilters = () => {
    resetFilters()
    clearResults()
  }

  const totalPages = Math.ceil(totalCount / (filters.numOfRows || 30))

  // 정렬 옵션
  const sortOptions = [
    { value: 'AD', label: '출원일자' },
    { value: 'PD', label: '공고일자' },
    { value: 'GD', label: '등록일자' },
    { value: 'OPD', label: '공개일자' },
    { value: 'FD', label: '국제출원일자' },
    { value: 'FOD', label: '국제공개일자' },
    { value: 'RD', label: '우선권주장일자' }
  ]

  // 행정처분 상태 옵션
  const statusOptions = [
    { value: '', label: '전체' },
    { value: 'A', label: '공개' },
    { value: 'C', label: '취하' },
    { value: 'F', label: '소멸' },
    { value: 'G', label: '포기' },
    { value: 'I', label: '무효' },
    { value: 'J', label: '거절' },
    { value: 'R', label: '등록' }
  ]

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-secondary-100 mb-4">
            KIPRIS 특허 검색
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400 text-lg">
            한국특허정보원(KIPI) KIPRIS API와 연동된 전문 특허 검색 시스템
          </p>
        </div>





        {/* Search Form */}
        <Card className="mb-8" variant="elevated">
          <CardContent>
            <form 
              onSubmit={(e) => {
                e.preventDefault()
                handleSearch()
              }}
              className="space-y-6"
            >
              {/* Basic Search */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      label="검색어"
                      placeholder="특허 제목, 키워드, 출원인 등을 입력하세요"
                      value={filters.word || ''}
                      onChange={(e) => handleFilterChange('word', e.target.value)}
                      size="lg"
                    />
                  </div>
                  <div className="flex gap-2 sm:items-end">
                    <Button 
                      type="submit" 
                      loading={loading}
                      size="lg"
                      className="min-w-[120px]"
                    >
                      <SearchIcon className="w-5 h-5 mr-2" />
                      검색
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      size="lg"
                      aria-expanded={showAdvancedFilters}
                      aria-controls="advanced-filters"
                    >
                      <Filter className="w-5 h-5 mr-2" />
                      {showAdvancedFilters ? '간단히' : '상세'}
                    </Button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="text-secondary-600 dark:text-secondary-400"
                  >
                    <X className="w-4 h-4 mr-1" />
                    필터 초기화
                  </Button>
                </div>
              </div>

              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <div 
                  id="advanced-filters"
                  className="border-t border-secondary-200 dark:border-secondary-700 pt-6 space-y-6"
                >
                  {/* Filter Tabs */}
                  <div className="border-b border-secondary-200 dark:border-secondary-700">
                    <nav className="-mb-px flex space-x-8" aria-label="필터 탭">
                      {[
                        { id: 'basic', label: '기본 검색', icon: SearchIcon },
                        { id: 'number', label: '번호 검색', icon: Hash },
                        { id: 'date', label: '날짜 검색', icon: Calendar },
                        { id: 'person', label: '인명 검색', icon: User }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id as any)}
                          className={cn(
                            'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                            activeTab === tab.id
                              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                              : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300 dark:text-secondary-400 dark:hover:text-secondary-300 dark:hover:border-secondary-600'
                          )}
                          aria-current={activeTab === tab.id ? 'page' : undefined}
                        >
                          <tab.icon className="w-5 h-5 mr-2" />
                          {tab.label}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Basic Search Tab */}
                  {activeTab === 'basic' && (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <Input
                          label="발명의명칭"
                          placeholder="발명의명칭을 입력하세요"
                          value={filters.inventionTitle || ''}
                          onChange={(e) => handleFilterChange('inventionTitle', e.target.value)}
                        />
                        <Input
                          label="IPC 코드"
                          placeholder="IPC 코드를 입력하세요 (예: G06F)"
                          value={filters.ipcNumber || ''}
                          onChange={(e) => handleFilterChange('ipcNumber', e.target.value)}
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">초록</label>
                          <textarea
              className="w-full px-3 py-2 bg-slate-800 border border-ms-line dark:border-dark-700 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ms-olive focus:border-ms-olive"
                            placeholder="초록 내용을 입력하세요"
                            rows={3}
                            value={filters.astrtCont || ''}
                            onChange={(e) => handleFilterChange('astrtCont', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">청구범위</label>
                          <textarea
              className="w-full px-3 py-2 bg-slate-800 border border-ms-line dark:border-dark-700 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ms-olive focus:border-ms-olive"
                            placeholder="청구범위 내용을 입력하세요"
                            rows={3}
                            value={filters.claimScope || ''}
                            onChange={(e) => handleFilterChange('claimScope', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Number Search Tab */}
                  {activeTab === 'number' && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Input
                        label="출원번호"
                        placeholder="출원번호를 입력하세요"
                        value={filters.applicationNumber || ''}
                        onChange={(e) => handleFilterChange('applicationNumber', e.target.value)}
                      />
                      <Input
                        label="공개번호"
                        placeholder="공개번호를 입력하세요"
                        value={filters.openNumber || ''}
                        onChange={(e) => handleFilterChange('openNumber', e.target.value)}
                      />
                      <Input
                        label="공고번호"
                        placeholder="공고번호를 입력하세요"
                        value={filters.publicationNumber || ''}
                        onChange={(e) => handleFilterChange('publicationNumber', e.target.value)}
                      />
                      <Input
                        label="등록번호"
                        placeholder="등록번호를 입력하세요"
                        value={filters.registerNumber || ''}
                        onChange={(e) => handleFilterChange('registerNumber', e.target.value)}
                      />
                      <Input
                        label="우선권주장번호"
                        placeholder="우선권주장번호를 입력하세요"
                        value={filters.priorityApplicationNumber || ''}
                        onChange={(e) => handleFilterChange('priorityApplicationNumber', e.target.value)}
                      />
                      <Input
                        label="국제출원번호"
                        placeholder="국제출원번호를 입력하세요"
                        value={filters.internationalApplicationNumber || ''}
                        onChange={(e) => handleFilterChange('internationalApplicationNumber', e.target.value)}
                      />
                    </div>
                  )}

                  {/* Date Search Tab */}
                  {activeTab === 'date' && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Input
                        label="출원일자"
                        type="date"
                        value={filters.applicationDate || ''}
                        onChange={(e) => handleFilterChange('applicationDate', e.target.value)}
                      />
                      <Input
                        label="공개일자"
                        type="date"
                        value={filters.openDate || ''}
                        onChange={(e) => handleFilterChange('openDate', e.target.value)}
                      />
                      <Input
                        label="공고일자"
                        type="date"
                        value={filters.publicationDate || ''}
                        onChange={(e) => handleFilterChange('publicationDate', e.target.value)}
                      />
                      <Input
                        label="등록일자"
                        type="date"
                        value={filters.registerDate || ''}
                        onChange={(e) => handleFilterChange('registerDate', e.target.value)}
                      />
                      <Input
                        label="우선권주장일자"
                        type="date"
                        value={filters.priorityApplicationDate || ''}
                        onChange={(e) => handleFilterChange('priorityApplicationDate', e.target.value)}
                      />
                      <Input
                        label="국제출원일자"
                        type="date"
                        value={filters.internationalApplicationDate || ''}
                        onChange={(e) => handleFilterChange('internationalApplicationDate', e.target.value)}
                      />
                    </div>
                  )}

                  {/* Person Info Tab */}
                  {activeTab === 'person' && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        label="출원인명"
                        placeholder="출원인명을 입력하세요"
                        value={filters.applicant || ''}
                        onChange={(e) => handleFilterChange('applicant', e.target.value)}
                      />
                      <Input
                        label="발명자명"
                        placeholder="발명자명을 입력하세요"
                        value={filters.inventors || ''}
                        onChange={(e) => handleFilterChange('inventors', e.target.value)}
                      />
                      <Input
                        label="대리인명"
                        placeholder="대리인명을 입력하세요"
                        value={filters.agent || ''}
                        onChange={(e) => handleFilterChange('agent', e.target.value)}
                      />
                      <Input
                        label="등록권자"
                        placeholder="등록권자명을 입력하세요"
                        value={filters.rightHoler || ''}
                        onChange={(e) => handleFilterChange('rightHoler', e.target.value)}
                      />
                    </div>
                  )}

                  {/* Additional Options */}
                  <div className="border-t border-slate-700 pt-4 mt-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      {/* Patent Type */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">특허 유형</label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters.patent || false}
                              onChange={(e) => handleFilterChange('patent', e.target.checked)}
                              className="mr-2 rounded border-ms-line bg-slate-800 text-ms-olive focus:ring-ms-olive"
                            />
                            <span className="text-sm text-slate-300">특허</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters.utility || false}
                              onChange={(e) => handleFilterChange('utility', e.target.checked)}
                              className="mr-2 rounded border-ms-line bg-slate-800 text-ms-olive focus:ring-ms-olive"
                            />
                            <span className="text-sm text-slate-300">실용신안</span>
                          </label>
                        </div>
                      </div>

                      {/* Administrative Status */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">행정처분</label>
                        <select
                          value={filters.lastvalue || ''}
                          onChange={(e) => handleFilterChange('lastvalue', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-ms-line rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-ms-olive"
                        >
                          {statusOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sort Options */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">정렬기준</label>
                        <select
                          value={filters.sortSpec || 'AD'}
                          onChange={(e) => handleFilterChange('sortSpec', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-ms-line rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-ms-olive"
                        >
                          {sortOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sort Direction & Page Size */}
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.descSort || false}
                            onChange={(e) => handleFilterChange('descSort', e.target.checked)}
              className="mr-2 rounded border-ms-line dark:border-dark-700 bg-slate-800 text-ms-olive focus:ring-ms-olive"
                          />
                          <span className="text-sm text-slate-300">내림차순</span>
                        </label>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">페이지당 건수</label>
                          <select
                            value={filters.numOfRows || 30}
                            onChange={(e) => handleFilterChange('numOfRows', parseInt(e.target.value))}
                            className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value={10}>10</option>
                            <option value={30}>30</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClearFilters}
                      >
                        전체 초기화
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAdvancedFilters(false)}
                      >
                        <X className="w-4 h-4 mr-2" />
                        닫기
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Search Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loading size="lg" text="KIPRIS에서 검색 중..." />
          </div>
        ) : error ? (
          <div className="py-8">
            <ErrorMessage
              title="검색 오류"
              message={error}
              onRetry={() => handleSearch(currentPage)}
              showRetryButton={true}
            />
          </div>
        ) : results.length > 0 ? (
          <>
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100">
                  검색 결과
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mt-1">
                  총 <span className="font-medium text-primary-600 dark:text-primary-400">{totalCount.toLocaleString()}</span>건의 특허가 검색되었습니다
                  {totalPages > 0 && (
                    <span className="ml-2">
                      페이지 <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                    </span>
                  )}
                </p>
              </div>
              
              {/* Results per page selector */}
              <div className="flex items-center gap-2">
                <label htmlFor="results-per-page" className="text-sm text-secondary-600 dark:text-secondary-400">
                  페이지당:
                </label>
                <select
                  id="results-per-page"
                  value={filters.numOfRows || 30}
                  onChange={(e) => handleFilterChange('numOfRows', parseInt(e.target.value))}
                  className={cn(
                    'px-3 py-2 text-sm rounded-lg border',
                    'bg-white dark:bg-dark-800',
                    'border-secondary-300 dark:border-secondary-600',
                    'text-secondary-900 dark:text-secondary-100',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                    'focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900'
                  )}
                >
                  <option value={10}>10개</option>
                  <option value={30}>30개</option>
                  <option value={50}>50개</option>
                  <option value={100}>100개</option>
                  <option value={200}>200개</option>
                  <option value={500}>500개</option>
                </select>
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-6 mb-8">
              {results.map((patent, index) => {
                console.log('🔍 특허 데이터 렌더링:', { 
                  index, 
                  applicationNumber: patent.applicationNumber, 
                  title: patent.inventionTitle,
                  hasApplicationNumber: !!patent.applicationNumber 
                });
                
                return (
                  <div 
                    key={patent.indexNo || index}
                    className="bg-white border border-gray-200 rounded-lg p-6 ms-card-minimal transition-colors hover:bg-gray-50"
                  >
                    <div className="mb-3">
                      <span className="inline-block ms-olive-pill text-xs font-semibold px-2.5 py-0.5 rounded">
                        {patent.applicationNumber}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-3">
                      <a 
                        href={`/patent/${patent.applicationNumber}`}
                        className="ms-olive-text hover:underline"
                      >
                        {patent.inventionTitle}
                      </a>
                    </h3>
                    
                    {patent.astrtCont && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">특허 요약</h4>
                        <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded-md">
                          {patent.astrtCont.length > 300 
                            ? `${patent.astrtCont.substring(0, 300)}...` 
                            : patent.astrtCont}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        {patent.applicantName && (
                          <span>출원인: {patent.applicantName}</span>
                        )}
                      </div>
                      
                      <a 
                        href={`/patent/${patent.applicationNumber}`}
                        className="inline-block text-sm font-semibold rounded-md px-4 py-2 bg-[var(--ms-olive-600)] hover:bg-[var(--ms-olive-700)] text-white border-ms-line transition-colors"
                      >
                        상세보기
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-secondary-200 dark:border-secondary-700 pt-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button
                    variant="outline"
                    onClick={() => handleSearch(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    이전
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSearch(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    다음
                  </Button>
                </div>
                
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-secondary-700 dark:text-secondary-300">
                      <span className="font-medium">{((currentPage - 1) * (filters.numOfRows || 30)) + 1}</span>
                      {' - '}
                      <span className="font-medium">
                        {Math.min(currentPage * (filters.numOfRows || 30), totalCount)}
                      </span>
                      {' / '}
                      <span className="font-medium">{totalCount.toLocaleString()}</span>
                      {' 건'}
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="페이지네이션">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="rounded-r-none"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="sr-only">이전 페이지</span>
                      </Button>
                      
                      {/* Page Numbers - 모든 페이지 표시 (하드 제한 제거) */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "primary" : "outline"}
                          size="sm"
                          onClick={() => handleSearch(pageNum)}
                          className="rounded-none"
                        >
                          {pageNum}
                        </Button>
                      ))}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="rounded-l-none"
                      >
                        <ChevronRight className="w-4 h-4" />
                        <span className="sr-only">다음 페이지</span>
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : filters.word ? (
          <>
            {/* Results Header for No Results */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100">
                  검색 결과
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400 mt-1">
                  총 <span className="font-medium text-primary-600 dark:text-primary-400">{totalCount.toLocaleString()}</span>건의 특허가 검색되었습니다
                  {totalPages > 0 && (
                    <span className="ml-2">
                      페이지 <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <Card className="text-center py-12">
              <CardContent>
                <SearchIcon className="mx-auto h-12 w-12 text-secondary-400 dark:text-secondary-500 mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                  검색 결과가 없습니다
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  다른 검색어를 시도하거나 필터를 조정해보세요.
                </p>
                <Button variant="outline" onClick={handleClearFilters}>
                  필터 초기화
                </Button>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </Layout>
  )
}