import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, Filter, Calendar, Building, FileText, TrendingUp, ChevronLeft, ChevronRight, Settings, X, Plus, Hash, User } from 'lucide-react'

import Button from '../components/UI/Button'
import Input from '../components/UI/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card'
import Loading from '../components/UI/Loading'
import { useSearchStore } from '../store/searchStore'
import { formatDate, truncateText, cn } from '../lib/utils'
import { toast } from 'sonner'
import { activityTracker } from '../lib/activityTracker'
import { useAuthStore } from '../store/authStore'

interface Patent {
  indexNo?: string
  applicationNumber: string
  inventionTitle: string
  astrtCont?: string
  applicantName?: string
}

interface SearchFilters {
  // 기본 검색 필드
  word?: string
  // 발명의 명칭
  inventionTitle?: string
  // 초록
  astrtCont?: string
  // 청구범위
  claimScope?: string
  // IPC 코드
  ipcNumber?: string
  // CPC 코드
  cpcNumber?: string
  // 출원번호
  applicationNumber?: string
  // 공개번호
  openNumber?: string
  // 공고번호
  publicationNumber?: string
  // 등록번호
  registerNumber?: string
  // 우선권주장번호
  priorityApplicationNumber?: string
  // 국제출원번호
  internationalApplicationNumber?: string
  // 국제공개번호
  internationOpenNumber?: string
  // 출원일자
  applicationDate?: string
  // 공개일자
  openDate?: string
  // 공고일자
  publicationDate?: string
  // 등록일자
  registerDate?: string
  // 우선권주장일자
  priorityApplicationDate?: string
  // 국제출원일자
  internationalApplicationDate?: string
  // 국제공개일자
  internationOpenDate?: string
  // 출원인
  applicant?: string
  // 발명자
  inventors?: string
  // 대리인
  agent?: string
  // 등록권자
  rightHoler?: string
  // 특허 포함 여부
  patent?: boolean
  // 실용신안 포함 여부
  utility?: boolean
  // 행정처분 상태
  lastvalue?: string
  // 페이지 번호
  pageNo?: number
  // 페이지당 건수
  numOfRows?: number
  // 정렬 기준
  sortSpec?: string
  // 정렬 방식
  descSort?: boolean
  // 기존 호환성을 위한 키워드 필드
  keyword?: string
}

export default function Search() {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'number' | 'date' | 'person'>('basic')
  const [searchField, setSearchField] = useState<'word' | 'inventionTitle' | 'astrtCont' | 'applicant'>('word')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const {
    filters,
    results,
    loading,
    totalCount,
    currentPage,
    setFilters,
    searchPatents,
    clearResults,
    resetFilters,
    loadSearchState
  } = useSearchStore()

  const { user } = useAuthStore()

  // 사용자 ID 설정
  useEffect(() => {
    if (user?.id) {
      activityTracker.setUserId(user.id)
    }
  }, [user?.id])

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
    console.log('[SEARCH] [Search] 검색 시작:', { page, currentTotalCount: totalCount });
    
    // 검색 활동 추적을 위한 데이터 준비
    const searchKeyword = filters.word || filters.inventionTitle || filters.astrtCont || filters.applicant || filters.keyword || ''
    const searchFilters = { ...filters }
    
    const { error } = await searchPatents(page)
    if (error) {
      toast.error(error)
      // 검색 오류 추적
      if (user?.id) {
        activityTracker.trackError('search_error', error, `Search failed for keyword: ${searchKeyword}`)
      }
    } else {
      console.log('[SUCCESS] [Search] 검색 완료:', { 
        resultsLength: results.length, 
        totalCount, 
        currentPage 
      });
      
      // 중복 제거: 검색 성공 활동 추적은 searchStore에서 이미 처리됨
      // 검색 성공 활동 추적
      // if (user?.id && searchKeyword) {
      //   activityTracker.trackSearch(searchKeyword, searchFilters, totalCount)
      // }
      
      // 대시보드 실시간 업데이트를 위한 이벤트 발생
      if (typeof window !== 'undefined' && user?.id && searchKeyword) {
        console.log('🔍 [Search] searchCompleted 이벤트 발생:', {
          keyword: searchKeyword,
          totalResults: totalCount,
          userId: user.id
        })
        
        const searchCompletedEvent = new CustomEvent('searchCompleted', {
          detail: {
            keyword: searchKeyword,
            totalResults: totalCount,
            userId: user.id,
            timestamp: new Date().toISOString()
          }
        })
        
        window.dispatchEvent(searchCompletedEvent)
      }
    }
  }

  const handleFilterChange = (field: string, value: string | boolean | number) => {
    setFilters({ [field]: value })
    
    // 필터 변경 활동 추적
    if (user?.id) {
      activityTracker.trackFilterChange({ [field]: value }, filters)
    }
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
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                        검색 필드 선택
                      </label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {[
                          { value: 'word', label: '전체검색', desc: '모든 필드에서 검색' },
                          { value: 'inventionTitle', label: '발명의명칭', desc: '특허 제목에서만 검색' },
                          { value: 'astrtCont', label: '초록', desc: '특허 초록에서만 검색' },
                          { value: 'applicant', label: '출원인', desc: '출원인명에서만 검색' }
                        ].map((field) => (
                          <button
                            key={field.value}
                            type="button"
                            onClick={() => {
                              setSearchField(field.value as any)
                              // 기존 검색어를 새로운 필드로 이동
                              const currentValue = filters[searchField as keyof typeof filters] as string || ''
                              if (currentValue) {
                                handleFilterChange(searchField, '') // 기존 필드 클리어
                                handleFilterChange(field.value, currentValue) // 새 필드에 설정
                              }
                            }}
                            className={cn(
                              'px-3 py-2 text-sm rounded-lg border transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                              searchField === field.value
                                ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-700 dark:text-primary-300'
                                : 'bg-white border-secondary-300 text-secondary-700 hover:bg-secondary-50 dark:bg-secondary-800 dark:border-secondary-600 dark:text-secondary-300 dark:hover:bg-secondary-700'
                            )}
                            title={field.desc}
                          >
                            {field.label}
                          </button>
                        ))}
                      </div>
                      <Input
                        label={searchField === 'word' ? '검색어' : 
                               searchField === 'inventionTitle' ? '발명의명칭' :
                               searchField === 'astrtCont' ? '초록 검색어' :
                               searchField === 'applicant' ? '출원인명' : '검색어'}
                        placeholder={
                          searchField === 'word' ? '특허 제목, 키워드, 출원인 등을 입력하세요' :
                          searchField === 'inventionTitle' ? '발명의 명칭을 입력하세요' :
                          searchField === 'astrtCont' ? '초록에서 찾을 키워드를 입력하세요' :
                          searchField === 'applicant' ? '출원인명을 입력하세요' : '검색어를 입력하세요'
                        }
                        value={(filters[searchField] as string) || ''}
                        onChange={(e) => handleFilterChange(searchField, e.target.value)}
                        size="lg"
                      />
                    </div>
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
                        <Input
                          label="CPC 코드"
                          placeholder="CPC 코드를 입력하세요 (예: G06F3/01)"
                          value={filters.cpcNumber || ''}
                          onChange={(e) => handleFilterChange('cpcNumber', e.target.value)}
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">초록</label>
                          <textarea
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent direction-ltr"
                            placeholder="초록 내용을 입력하세요"
                            rows={3}
                            value={filters.astrtCont || ''}
                            onChange={(e) => handleFilterChange('astrtCont', e.target.value)}
                            style={{ direction: 'ltr', textAlign: 'left' }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">청구범위</label>
                          <textarea
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent direction-ltr"
                            placeholder="청구범위 내용을 입력하세요"
                            rows={3}
                            value={filters.claimScope || ''}
                            onChange={(e) => handleFilterChange('claimScope', e.target.value)}
                            style={{ direction: 'ltr', textAlign: 'left' }}
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
                      <Input
                        label="국제공개번호"
                        placeholder="국제공개번호를 입력하세요"
                        value={filters.internationOpenNumber || ''}
                        onChange={(e) => handleFilterChange('internationOpenNumber', e.target.value)}
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
                      <Input
                        label="국제공개일자"
                        type="date"
                        value={filters.internationOpenDate || ''}
                        onChange={(e) => handleFilterChange('internationOpenDate', e.target.value)}
                      />
                    </div>
                  )}

                  {/* Person Info Tab */}
                  {activeTab === 'person' && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        label="출원인"
                        placeholder="출원인명을 입력하세요"
                        value={filters.applicant || ''}
                        onChange={(e) => handleFilterChange('applicant', e.target.value)}
                      />
                      <Input
                        label="발명자"
                        placeholder="발명자명을 입력하세요"
                        value={filters.inventors || ''}
                        onChange={(e) => handleFilterChange('inventors', e.target.value)}
                      />
                      <Input
                        label="대리인"
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
                  <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4 mt-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      {/* Patent Type */}
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">특허 유형</label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters.patent || false}
                              onChange={(e) => handleFilterChange('patent', e.target.checked)}
                              className="mr-2 rounded border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-secondary-700 dark:text-secondary-300">특허</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters.utility || false}
                              onChange={(e) => handleFilterChange('utility', e.target.checked)}
                              className="mr-2 rounded border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-secondary-700 dark:text-secondary-300">실용신안</span>
                          </label>
                        </div>
                      </div>

                      {/* Administrative Status */}
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">행정처분</label>
                        <select
                          value={filters.lastvalue || ''}
                          onChange={(e) => handleFilterChange('lastvalue', e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-lg text-secondary-900 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">정렬 기준</label>
                        <select
                          value={filters.sortSpec || 'AD'}
                          onChange={(e) => handleFilterChange('sortSpec', e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-lg text-secondary-900 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="mr-2 rounded border-secondary-300 bg-secondary-800 text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-sm text-secondary-300">내림차순</span>
                        </label>
                        <div>
                          <label className="block text-xs text-secondary-400 mb-1">페이지당 건수</label>
                          <select
                            value={filters.numOfRows || 30}
                            onChange={(e) => handleFilterChange('numOfRows', parseInt(e.target.value))}
                            className="w-full px-2 py-1 text-sm bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="px-3 py-1 bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded text-sm text-secondary-900 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={10}>10개</option>
                  <option value={20}>20개</option>
                  <option value={30}>30개</option>
                  <option value={50}>50개</option>
                </select>
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-4 mb-8">
              {results.map((patent, index) => (
                <Card key={`${patent.applicationNumber}-${index}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                            {patent.applicationNumber}
                          </span>
                          {patent.registerNumber && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200">
                              등록: {patent.registerNumber}
                            </span>
                          )}
                          {patent.registerStatus && (
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                              patent.registerStatus === '등록' 
                                ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                                : 'bg-secondary-100 text-secondary-800 dark:bg-secondary-800 dark:text-secondary-200'
                            )}>
                            {patent.registerStatus}
                          </span>
                          )}
                        </div>
                        
                        <h3 className="text-lg font-semibold">
                          <Link 
                            to={`/patent/${patent.applicationNumber}`}
                            className={cn(
                              "text-primary-700 dark:text-primary-300",
                              "hover:text-primary-800 dark:hover:text-primary-200",
                              "visited:text-purple-700 dark:visited:text-purple-300",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                              "focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900",
                              "rounded transition-colors duration-200",
                              "underline decoration-primary-300 dark:decoration-primary-600",
                              "hover:decoration-primary-500 dark:hover:decoration-primary-400"
                            )}
                          >
                            {patent.inventionTitle}
                          </Link>
                        </h3>
                        
                        {patent.astrtCont && (
                          <p className="text-secondary-600 dark:text-secondary-400 leading-relaxed">
                            {truncateText(patent.astrtCont, 200)}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-secondary-500 dark:text-secondary-400">
                          <div className="flex items-center">
                            <Building className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span className="font-medium">{patent.applicantName}</span>
                          </div>
                          {patent.applicationDate && (
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                              출원: {formatDate(patent.applicationDate)}
                            </div>
                          )}
                          {patent.registerDate && (
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                              등록: {formatDate(patent.registerDate)}
                            </div>
                          )}
                          {patent.ipcNumber && (
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 mr-1 flex-shrink-0" />
                              IPC: {patent.ipcNumber}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Patent Image and Actions */}
                      <div className="flex lg:flex-col items-center lg:items-end gap-3">
                        {patent.drawing && (
                          <img 
                            src={patent.drawing} 
                            alt={`${patent.inventionTitle} 특허 도면`}
                            className="w-20 h-20 object-cover rounded-lg border border-secondary-200 dark:border-secondary-700 shadow-sm"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          onClick={() => {
                            // 특허 상세보기 클릭 활동 추적
                            if (user?.id) {
                              activityTracker.trackPatentView(patent.applicationNumber, patent.inventionTitle, {
                                applicantName: patent.applicantName,
                                source: 'search_results'
                              })
                            }
                          }}
                        >
                          <Link to={`/patent/${patent.applicationNumber}`}>
                            <FileText className="w-4 h-4 mr-1" />
                            상세보기
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    이전
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSearch(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    다음
                    <ChevronRight className="w-4 h-4 ml-1" />
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
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm font-medium text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-700"
                      >
                        <span className="sr-only">이전</span>
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </Button>
                      
                      {/* Page Numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                        if (pageNum > totalPages) return null
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSearch(pageNum)}
                            className={cn(
                              "relative inline-flex items-center px-4 py-2 border text-sm font-medium",
                              currentPage === pageNum
                                ? "z-10 bg-primary-50 dark:bg-primary-900 border-primary-500 text-primary-600 dark:text-primary-400"
                                : "bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-700"
                            )}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm font-medium text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-700"
                      >
                        <span className="sr-only">다음</span>
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
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
  )
}