import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, Filter, Calendar, Building, FileText, TrendingUp, ChevronLeft, ChevronRight, Settings, X, Plus } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import Button from '../components/UI/Button'
import Input from '../components/UI/Input'
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card'
import Loading from '../components/UI/Loading'
import { useSearchStore } from '../store/searchStore'
import { formatDate, truncateText } from '../lib/utils'
import { toast } from 'sonner'

export default function Search() {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'number' | 'date' | 'person'>('basic')
  
  const {
    filters,
    results,
    loading,
    totalCount,
    currentPage,
    setFilters,
    searchPatents,
    clearResults,
    resetFilters
  } = useSearchStore()

  useEffect(() => {
    // If there's a search term, search automatically
    const hasSearchTerm = filters.word || filters.inventionTitle || filters.keyword
    if (hasSearchTerm) {
      handleSearch()
    }
  }, [])

  const handleSearch = async (page = 1) => {
    const { error } = await searchPatents(page)
    if (error) {
      toast.error(error)
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
          <h1 className="text-3xl font-bold text-white mb-4">KIPRIS 특허 검색</h1>
          <p className="text-slate-400">
            한국특허정보원(KIPI) KIPRIS API와 연동된 전문 특허 검색 시스템
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardContent>
            <form 
              onSubmit={(e) => {
                e.preventDefault()
                handleSearch(1)
              }}
              className="space-y-6"
            >
              {/* Main Search */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="자유검색 키워드를 입력하세요 (예: 인공지능, 블록체인, IoT)"
                    value={filters.word || filters.keyword || ''}
                    onChange={(e) => {
                      handleFilterChange('word', e.target.value)
                      handleFilterChange('keyword', e.target.value) // 호환성
                    }}
                    className="text-lg py-3"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="flex items-center"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    고급검색
                  </Button>
                  <Button type="submit" loading={loading} className="px-8">
                    <SearchIcon className="w-4 h-4 mr-2" />
                    검색
                  </Button>
                </div>
              </div>

              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <div className="border-t border-slate-700 pt-6">
                  {/* Filter Tabs */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <Button
                      type="button"
                      variant={activeTab === 'basic' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('basic')}
                    >
                      기본검색
                    </Button>
                    <Button
                      type="button"
                      variant={activeTab === 'number' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('number')}
                    >
                      번호검색
                    </Button>
                    <Button
                      type="button"
                      variant={activeTab === 'date' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('date')}
                    >
                      날짜검색
                    </Button>
                    <Button
                      type="button"
                      variant={activeTab === 'person' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('person')}
                    >
                      인물정보
                    </Button>
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
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="초록 내용을 입력하세요"
                            rows={3}
                            value={filters.astrtCont || ''}
                            onChange={(e) => handleFilterChange('astrtCont', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">청구범위</label>
                          <textarea
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                              className="mr-2 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-300">특허</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters.utility || false}
                              onChange={(e) => handleFilterChange('utility', e.target.checked)}
                              className="mr-2 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
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
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="mr-2 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
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
        ) : results.length > 0 ? (
          <>
            {/* Results Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="text-slate-300">
                총 <span className="text-white font-semibold">{totalCount.toLocaleString()}</span>건의 특허가 검색되었습니다
              </div>
              <div className="text-sm text-slate-400">
                페이지 {currentPage} / {totalPages}
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-4 mb-8">
              {results.map((patent, index) => (
                <Card key={patent.indexNo || index} hover>
                  <CardContent>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm text-blue-400 font-medium">
                            {patent.applicationNumber}
                          </span>
                          {patent.registerNumber && (
                            <span className="text-sm text-green-400 font-medium">
                              등록: {patent.registerNumber}
                            </span>
                          )}
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                            {patent.registerStatus}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-white mb-2 hover:text-blue-400 transition-colors">
                          <Link to={`/patent/${patent.applicationNumber}`}>
                            {patent.inventionTitle}
                          </Link>
                        </h3>
                        
                        {patent.astrtCont && (
                          <p className="text-slate-400 mb-3 leading-relaxed">
                            {truncateText(patent.astrtCont, 200)}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                          <div className="flex items-center">
                            <Building className="w-4 h-4 mr-1" />
                            {patent.applicantName}
                          </div>
                          {patent.applicationDate && (
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              출원: {formatDate(patent.applicationDate)}
                            </div>
                          )}
                          {patent.registerDate && (
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              등록: {formatDate(patent.registerDate)}
                            </div>
                          )}
                          {patent.ipcNumber && (
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 mr-1" />
                              IPC: {patent.ipcNumber}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-4 flex flex-col space-y-2">
                        {patent.drawing && (
                          <img 
                            src={patent.drawing} 
                            alt="특허 도면"
                            className="w-20 h-20 object-cover rounded border border-slate-600"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            window.open(`/patent/${patent.applicationNumber}`, '_blank')
                          }}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          상세보기
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSearch(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전
                </Button>
                
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => handleSearch(page)}
                        disabled={loading}
                      >
                        {page}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSearch(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                >
                  다음
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        ) : filters.word || filters.inventionTitle || filters.keyword ? (
          <Card>
            <CardContent className="text-center py-12">
              <SearchIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                검색 결과가 없습니다
              </h3>
              <p className="text-slate-400 mb-4">
                다른 키워드로 검색해보시거나 검색 조건을 변경해보세요
              </p>
              <Button variant="outline" onClick={handleClearFilters}>
                검색 조건 초기화
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <SearchIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                KIPRIS 특허 검색을 시작하세요
              </h3>
              <p className="text-slate-400 mb-4">
                키워드를 입력하여 한국특허정보원의 특허 데이터베이스에서 관련 특허를 검색할 수 있습니다
              </p>
              <div className="text-sm text-slate-500">
                • 자유검색, 발명의명칭, 출원인명 등 다양한 조건으로 검색 가능<br/>
                • 출원번호, 등록번호 등 정확한 번호로 검색 가능<br/>
                • 날짜 범위 및 행정처분 상태별 필터링 지원
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}