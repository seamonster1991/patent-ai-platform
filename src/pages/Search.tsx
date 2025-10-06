import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { SearchIcon, Filter, X, Hash, Calendar, User, ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '@/components/UI/Button'
import Input from '@/components/UI/Input'
import Loading from '@/components/UI/Loading'
import ErrorMessage from '@/components/UI/ErrorMessage'
import { cn } from '@/lib/utils'
import { searchPatents, getPatentDetail } from '@/lib/api'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { useSearchStore } from '../store/searchStore'

// 타입 정의
interface Patent {
  indexNo?: string
  applicationNumber: string
  inventionTitle: string
  astrtCont?: string
  applicantName?: string
}

interface SearchFilters {
  word?: string
  numOfRows?: number
  pageNo?: number
  sortSpec?: string
  descSort?: boolean
  inventionTitle?: string
  keyword?: string
  patent?: boolean
  utility?: boolean
  lastvalue?: string
  applicationNumber?: string
  publicationNumber?: string
  registerNumber?: string
  publicationDate?: string
  registerDate?: string
  priorityApplicationDate?: string
  internationalApplicationDate?: string
  applicant?: string
  inventors?: string
  agent?: string
  rightHoler?: string
  claimScope?: string
  openNumber?: string
  priorityApplicationNumber?: string
  internationalApplicationNumber?: string
  applicationDate?: string
  openDate?: string
  ipcNumber?: string
  astrtCont?: string
}

function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  // Use search store
  const {
    filters,
    results,
    loading,
    error,
    totalCount,
    currentPage,
    setFilters,
    searchPatents: storeSearchPatents,
    clearResults,
    resetFilters,
    saveSearchState,
    loadSearchState
  } = useSearchStore()
  
  const [totalPages, setTotalPages] = useState(0)
  
  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'number' | 'date' | 'person'>('basic')

  console.log('🔍 [Search] 현재 검색 상태:', { totalCount, resultsLength: results.length, currentPage, filters })

  // URL 파라미터 처리 및 검색 상태 복원
  useEffect(() => {
    const queryFromUrl = searchParams.get('q')
    if (queryFromUrl) {
      // 로그인 가드: 비로그인 시 로그인 페이지로 이동
      if (!user) {
        toast.error('검색 기능은 로그인 후 이용 가능합니다.')
        navigate('/login', { replace: true, state: { redirectTo: `/search?q=${encodeURIComponent(queryFromUrl)}` } })
        return
      }
      
      console.log('🔍 [Search] URL에서 검색어 감지:', queryFromUrl)
      
      // 필터 초기화 및 검색어 설정
      resetFilters()
      clearResults()
      setFilters({ 
        word: queryFromUrl,
        inventionTitle: queryFromUrl 
      })
    } else {
      // URL 파라미터가 없으면 저장된 검색 상태 복원 시도
      const hasRestoredState = loadSearchState()
      if (hasRestoredState) {
        console.log('✅ 검색 상태 복원 완료')
      }
    }
  }, [searchParams, user, navigate])

  // 필터가 변경되고 검색어가 있을 때 자동 검색 실행
  useEffect(() => {
    if (filters.word && user) {
      console.log('🔍 [Search] 필터 변경으로 인한 자동 검색 실행:', filters.word)
      storeSearchPatents()
    }
  }, [filters.word, user])

  // totalPages 업데이트
  useEffect(() => {
    const calculated = Math.ceil(totalCount / (filters.numOfRows || 30))
    setTotalPages(calculated)
  }, [totalCount, filters.numOfRows])

  // 키워드 분류 및 기록 함수
  const recordKeywordAnalytics = async (keyword: string) => {
    if (!keyword || !user) return

    try {
      // 키워드 분류 API 호출
      const classifyResponse = await fetch('/api/classify-keyword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword }),
      })

      if (classifyResponse.ok) {
        const classificationData = await classifyResponse.json()
        console.log('✅ [Search] 키워드 분류 및 기록 완료:', classificationData)
        return classificationData
      } else {
        console.warn('⚠️ [Search] 키워드 분류 실패:', classifyResponse.statusText)
      }
    } catch (error) {
      console.error('❌ [Search] 키워드 분류 중 오류:', error)
    }
    return null
  }

  const handleSearch = async (page = 1) => {
    console.log('🔍 [Search] 검색 시작:', { page, currentTotalCount: totalCount });
    // 로그인 가드: 비로그인 상태면 로그인 페이지로 이동
    if (!user) {
      toast.error('검색 기능은 로그인 후 이용 가능합니다.')
      navigate('/login', { replace: true, state: { redirectTo: `/search?q=${encodeURIComponent(filters.word || '')}` } })
      return
    }
    
    // 새로운 검색인 경우 (page === 1) 키워드 분류 및 기록
    let classificationData = null
    if (page === 1 && filters.word) {
      classificationData = await recordKeywordAnalytics(filters.word)
    }
    
    // searchStore의 searchPatents 함수 사용
    const result = await storeSearchPatents(page)
    if (result.error) {
      toast.error(result.error)
    } else {
      // 검색 상태 저장
      saveSearchState()
      console.log('✅ [Search] 검색 완료 및 상태 저장')
      
      // 키워드 분류 결과가 있으면 검색 히스토리에 기술 분야 정보 업데이트
      if (classificationData && classificationData.success) {
        try {
          await fetch('/api/users/search-history', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user.id,
              keyword: filters.word,
              technology_field: classificationData.data.technology_field,
              field_confidence: classificationData.data.field_confidence
            }),
          })
        } catch (error) {
          console.error('❌ [Search] 검색 히스토리 업데이트 중 오류:', error)
        }
      }
    }
  }

  const handleFilterChange = (field: string, value: string | boolean | number) => {
    // searchStore의 setFilters 사용
    setFilters({ [field]: value })
  }

  // 결과에 초록(astrtCont)이 없는 경우, 상세 API로 일부 항목을 보강
  useEffect(() => {
    const enrichAbstracts = async () => {
      try {
        const candidates = results
          .map((item, idx) => ({ item, idx }))
          .filter(({ item }) => !item.astrtCont && !!item.applicationNumber)
          .slice(0, 10) // 페이지당 최대 10건만 보강하여 과도한 요청 방지

        if (candidates.length === 0) return

        const updated = [...results]
        for (const { item, idx } of candidates) {
          const resp = await getPatentDetail(item.applicationNumber)
          if (resp.success && resp.data) {
            const dBody = (resp.data as any).body || {}
            const dItem = dBody.item || (resp.data as any).item || null
            if (dItem) {
              updated[idx] = {
                ...item,
                astrtCont: dItem.astrtCont || item.astrtCont,
                inventionTitle: dItem.inventionTitle || item.inventionTitle,
                applicantName: dItem.applicantName || item.applicantName
              }
            }
          }
        }
        // setResults(updated) // TODO: searchStore에 결과 업데이트 함수 추가 필요
      } catch (e) {
        console.warn('⚠️ 초록 보강 중 경고:', e)
      }
    }

    // 로딩 중이 아니고 결과가 있을 때만 보강 수행
    if (!loading && results && results.length > 0) {
      enrichAbstracts()
    }
  }, [results, currentPage])

  const handleClearFilters = () => {
    resetFilters()
    clearResults()
    // URL 파라미터도 제거
    setSearchParams({})
  }

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
    { value: 'G', label: '등록' },
    { value: 'R', label: '거절' },
    { value: 'W', label: '철회' }
  ]

  return (
    <div className="min-h-screen bg-ms-white">
        {/* 헤더 섹션 */}
        <div className="bg-ms-soft border-b border-ms-line">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="text-center">
              <h1 className="text-4xl font-light text-ms-text mb-4">
                KIPRIS 특허 검색
              </h1>
              <p className="text-lg text-ms-text-muted font-light max-w-2xl mx-auto">
                한국특허정보원의 공식 데이터베이스에서 특허 정보를 검색하세요
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* 검색 폼 */}
          <div className="ms-card mb-12">
            <div className="p-8">
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="검색어를 입력하세요..."
                    value={filters.word || ''}
                    onChange={(e) => handleFilterChange('word', e.target.value)}
                    className="text-lg py-4 border-ms-line focus:border-ms-olive"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch(1)
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={() => handleSearch(1)}
                  disabled={loading}
                  className="px-8 py-4 bg-ms-olive hover:bg-ms-olive/90 text-white font-medium"
                >
                  <SearchIcon className="w-5 h-5 mr-2" />
                  검색
                </Button>
              </div>

              {/* 빠른 액션 */}
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="border-ms-line text-ms-text hover:bg-ms-soft"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    고급 필터
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    className="border-ms-line text-ms-text-muted hover:bg-ms-soft"
                  >
                    <X className="w-4 h-4 mr-2" />
                    초기화
                  </Button>
                </div>
                
                {totalCount > 0 && (
                  <div className="text-sm text-ms-text-muted font-light">
                    총 <span className="font-medium text-ms-olive">{totalCount.toLocaleString()}</span>건의 결과
                  </div>
                )}
              </div>
            </div>

            {/* 고급 필터 */}
            {showAdvancedFilters && (
              <div className="border-t border-ms-line-soft bg-ms-soft/30">
                <div className="p-8">
                  {/* 탭 네비게이션 */}
                  <div className="flex border-b border-ms-line-soft mb-8">
                    {[
                      { key: 'basic', label: '기본 검색', icon: SearchIcon },
                      { key: 'number', label: '번호 검색', icon: Hash },
                      { key: 'date', label: '날짜 검색', icon: Calendar },
                      { key: 'person', label: '인명 검색', icon: User }
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key as any)}
                        className={cn(
                          "flex items-center px-6 py-3 font-medium border-b-2 transition-colors",
                          activeTab === key
                            ? "border-ms-olive text-ms-olive"
                            : "border-transparent text-ms-text-muted hover:text-ms-text"
                        )}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* 기본 검색 탭 */}
                  {activeTab === 'basic' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          발명의 명칭
                        </label>
                        <Input
                          type="text"
                          value={filters.inventionTitle || ''}
                          onChange={(e) => handleFilterChange('inventionTitle', e.target.value)}
                          placeholder="발명의 명칭을 입력하세요"
                          className="border-ms-line focus:border-ms-olive"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          IPC 분류코드
                        </label>
                        <Input
                          type="text"
                          value={filters.ipcNumber || ''}
                          onChange={(e) => handleFilterChange('ipcNumber', e.target.value)}
                          placeholder="예: A01B1/00"
                          className="border-ms-line focus:border-ms-olive"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          요약
                        </label>
                        <Input
                          type="text"
                          value={filters.astrtCont || ''}
                          onChange={(e) => handleFilterChange('astrtCont', e.target.value)}
                          placeholder="요약 내용을 입력하세요"
                          className="border-ms-line focus:border-ms-olive"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          청구범위
                        </label>
                        <Input
                          type="text"
                          value={filters.claimScope || ''}
                          onChange={(e) => handleFilterChange('claimScope', e.target.value)}
                          placeholder="청구범위 내용을 입력하세요"
                          className="border-ms-line focus:border-ms-olive"
                        />
                      </div>
                    </div>
                  )}

                  {/* 번호 검색 탭 */}
                  {activeTab === 'number' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          출원번호
                        </label>
                        <Input
                          type="text"
                          value={filters.applicationNumber || ''}
                          onChange={(e) => handleFilterChange('applicationNumber', e.target.value)}
                          placeholder="예: 1020230001234"
                          className="border-ms-line focus:border-ms-olive"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          공개번호
                        </label>
                        <Input
                          type="text"
                          value={filters.publicationNumber || ''}
                          onChange={(e) => handleFilterChange('publicationNumber', e.target.value)}
                          placeholder="예: 1020230001234"
                          className="border-ms-line focus:border-ms-olive"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          등록번호
                        </label>
                        <Input
                          type="text"
                          value={filters.registerNumber || ''}
                          onChange={(e) => handleFilterChange('registerNumber', e.target.value)}
                          placeholder="예: 1012345678"
                          className="border-ms-line focus:border-ms-olive"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          공고번호
                        </label>
                        <Input
                          type="text"
                          value={filters.openNumber || ''}
                          onChange={(e) => handleFilterChange('openNumber', e.target.value)}
                          placeholder="예: 1020230001234"
                          className="border-ms-line focus:border-ms-olive"
                        />
                      </div>
                    </div>
                  )}

                  {/* 날짜 검색 탭 */}
                  {activeTab === 'date' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          출원일자
                        </label>
                        <Input
                          type="date"
                          value={filters.applicationDate || ''}
                          onChange={(e) => handleFilterChange('applicationDate', e.target.value)}
                          className="border-ms-line focus:border-ms-olive"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          공개일자
                        </label>
                        <Input
                          type="date"
                          value={filters.openDate || ''}
                          onChange={(e) => handleFilterChange('openDate', e.target.value)}
                          className="border-ms-line focus:border-ms-olive"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          공고일자
                        </label>
                        <Input
                          type="date"
                          value={filters.publicationDate || ''}
                          onChange={(e) => handleFilterChange('publicationDate', e.target.value)}
                          className="border-ms-line focus:border-ms-olive"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          등록일자
                        </label>
                        <Input
                          type="date"
                          value={filters.registerDate || ''}
                          onChange={(e) => handleFilterChange('registerDate', e.target.value)}
                          className="border-ms-line focus:border-ms-olive"
                        />
                      </div>
                    </div>
                  )}

                  {/* 인명 검색 탭 */}
                  {activeTab === 'person' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          출원인
                        </label>
                        <Input
                          type="text"
                          value={filters.applicant || ''}
                          onChange={(e) => handleFilterChange('applicant', e.target.value)}
                          placeholder="출원인명을 입력하세요"
                          className="border-ms-line focus:border-ms-olive"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          발명자
                        </label>
                        <Input
                          type="text"
                          value={filters.inventors || ''}
                          onChange={(e) => handleFilterChange('inventors', e.target.value)}
                          placeholder="발명자명을 입력하세요"
                          className="border-ms-line focus:border-ms-olive"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          대리인
                        </label>
                        <Input
                          type="text"
                          value={filters.agent || ''}
                          onChange={(e) => handleFilterChange('agent', e.target.value)}
                          placeholder="대리인명을 입력하세요"
                          className="border-ms-line focus:border-ms-olive"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          권리자
                        </label>
                        <Input
                          type="text"
                          value={filters.rightHoler || ''}
                          onChange={(e) => handleFilterChange('rightHoler', e.target.value)}
                          placeholder="권리자명을 입력하세요"
                          className="border-ms-line focus:border-ms-olive"
                        />
                      </div>
                    </div>
                  )}

                  {/* 추가 옵션 */}
                  <div className="mt-8 pt-8 border-t border-ms-line-soft">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          특허 유형
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters.patent || false}
                              onChange={(e) => handleFilterChange('patent', e.target.checked)}
                              className="mr-2 text-ms-olive border-ms-line focus:ring-ms-olive"
                            />
                            <span className="text-sm text-ms-text">특허</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters.utility || false}
                              onChange={(e) => handleFilterChange('utility', e.target.checked)}
                              className="mr-2 text-ms-olive border-ms-line focus:ring-ms-olive"
                            />
                            <span className="text-sm text-ms-text">실용신안</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          정렬 기준
                        </label>
                        <select
                          value={filters.sortSpec || 'AD'}
                          onChange={(e) => handleFilterChange('sortSpec', e.target.value)}
                          className="w-full px-3 py-2 border border-ms-line rounded-md focus:border-ms-olive bg-white text-ms-text"
                        >
                          {sortOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-ms-text mb-2">
                          정렬 방향 및 페이지 크기
                        </label>
                        <div className="space-y-2">
                          <select
                            value={filters.descSort ? 'desc' : 'asc'}
                            onChange={(e) => handleFilterChange('descSort', e.target.value === 'desc')}
                            className="w-full px-3 py-2 border border-ms-line rounded-md focus:border-ms-olive bg-white text-ms-text"
                          >
                            <option value="asc">오름차순</option>
                            <option value="desc">내림차순</option>
                          </select>
                          <select
                            value={filters.numOfRows || 30}
                            onChange={(e) => handleFilterChange('numOfRows', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-ms-line rounded-md focus:border-ms-olive bg-white text-ms-text"
                          >
                            <option value={10}>10개씩 보기</option>
                            <option value={30}>30개씩 보기</option>
                            <option value={50}>50개씩 보기</option>
                            <option value={100}>100개씩 보기</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                      <Button
                        variant="outline"
                        onClick={handleClearFilters}
                        className="border-ms-line text-ms-text-muted hover:bg-ms-soft"
                      >
                        필터 초기화
                      </Button>
                      <Button
                        onClick={() => setShowAdvancedFilters(false)}
                        className="bg-ms-olive hover:bg-ms-olive/90 text-white"
                      >
                        필터 닫기
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 검색 결과 */}
          {loading && (
            <div className="flex justify-center py-12">
              <Loading />
            </div>
          )}

          {error && (
            <div className="mb-8">
              <ErrorMessage message={error} />
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div>
              {/* 결과 헤더 */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-light text-ms-text">
                  검색 결과
                </h2>
                <div className="text-sm text-ms-text-muted">
                  {currentPage}페이지 / 총 {totalPages}페이지
                </div>
              </div>

              {/* 결과 목록 */}
              <div className="space-y-6">
                {results.map((patent, index) => (
                  <div key={patent.applicationNumber || index} className="ms-card-minimal">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-medium text-ms-olive bg-ms-olive/10 px-2 py-1 rounded">
                              {patent.applicationNumber}
                            </span>
                          </div>
                          <h3 className="text-lg font-medium text-ms-text mb-2 leading-relaxed">
                            {patent.inventionTitle}
                          </h3>
                          <p className="text-sm text-ms-text-muted leading-relaxed mb-3">
                            {(patent.astrtCont && patent.astrtCont.trim().length > 0)
                              ? (patent.astrtCont.length > 200
                                  ? `${patent.astrtCont.substring(0, 200)}...`
                                  : patent.astrtCont)
                              : '요약 정보가 없습니다.'}
                          </p>
                          {patent.applicantName && (
                            <div className="text-sm text-ms-text-light">
                              <span className="font-medium">출원인:</span> {patent.applicantName}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/patent/${patent.applicationNumber}`)}
                          className="border-ms-olive text-ms-olive hover:bg-ms-olive hover:text-white"
                        >
                          상세보기
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-12">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilters({ ...filters, pageNo: currentPage - 1 })
                        storeSearchPatents()
                      }}
                      disabled={currentPage <= 1}
                      className="border-ms-line text-ms-text hover:bg-ms-soft disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          onClick={() => {
                            setFilters({ ...filters, pageNo: pageNum })
                            storeSearchPatents()
                          }}
                          className={cn(
                            "min-w-[40px]",
                            currentPage === pageNum
                              ? "bg-ms-olive text-white"
                              : "border-ms-line text-ms-text hover:bg-ms-soft"
                          )}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilters({ ...filters, pageNo: currentPage + 1 })
                        storeSearchPatents()
                      }}
                      disabled={currentPage >= totalPages}
                      className="border-ms-line text-ms-text hover:bg-ms-soft disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !error && results.length === 0 && filters.word && (
            <div className="text-center py-16">
              <div className="ms-card max-w-md mx-auto">
                <div className="p-8">
                  <SearchIcon className="w-12 h-12 text-ms-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-ms-text mb-2">
                    검색 결과가 없습니다
                  </h3>
                  <p className="text-sm text-ms-text-muted mb-6">
                    다른 검색어를 시도하거나 필터를 조정해보세요.
                  </p>
                    <Button
                      onClick={handleClearFilters}
                      className="bg-ms-olive hover:bg-ms-olive/90 text-white"
                    >
                      검색 초기화
                    </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  )
}

export default Search