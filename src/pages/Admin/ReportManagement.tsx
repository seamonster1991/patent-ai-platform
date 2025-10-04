import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter,
  MoreVertical,
  Download,
  Eye,
  Trash2,
  User,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Star,
  Calendar,
  Users,
  Activity,
  Target,
  Award
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';

const ReportManagement: React.FC = () => {
  const { 
    reportManagementData, 
    loading, 
    error,
    fetchReportManagementData,
    deleteReport 
  } = useAdminStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [actionDropdown, setActionDropdown] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    fetchReportManagementData();
  }, [fetchReportManagementData]);

  const handleRefresh = () => {
    fetchReportManagementData();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (window.confirm('정말로 이 리포트를 삭제하시겠습니까?')) {
      try {
        await deleteReport(reportId);
        await fetchReportManagementData();
      } catch (error) {
        console.error('리포트 삭제 실패:', error);
      }
    }
  };

  const handleSelectReport = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleSelectAll = () => {
    if (selectedReports.length === filteredReports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(filteredReports.map(report => report.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReports.length === 0) return;

    if (window.confirm(`선택된 ${selectedReports.length}개의 리포트를 삭제하시겠습니까?`)) {
      for (const reportId of selectedReports) {
        await deleteReport(reportId);
      }
      setSelectedReports([]);
      await fetchReportManagementData();
    }
  };

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  // 필터링된 리포트 목록
  const filteredReports = reportManagementData?.reports?.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.applicationNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesType = typeFilter === 'all' || report.type === typeFilter;
    const matchesUser = userFilter === 'all' || report.userId === userFilter;
    
    let matchesQuality = true;
    if (qualityFilter !== 'all') {
      const rating = report.qualityRating || 0;
      switch (qualityFilter) {
        case 'excellent':
          matchesQuality = rating >= 4.5;
          break;
        case 'good':
          matchesQuality = rating >= 3.5 && rating < 4.5;
          break;
        case 'average':
          matchesQuality = rating >= 2.5 && rating < 3.5;
          break;
        case 'poor':
          matchesQuality = rating < 2.5;
          break;
      }
    }
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const reportDate = new Date(report.createdAt);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = reportDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = reportDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = reportDate >= monthAgo;
          break;
        case '100days':
          const hundredDaysAgo = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);
          matchesDate = reportDate >= hundredDaysAgo;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesType && matchesDate && matchesUser && matchesQuality;
  }).sort((a, b) => {
    const aValue = a[sortBy as keyof typeof a];
    const bValue = b[sortBy as keyof typeof b];
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  }) || [];

  // 페이지네이션
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'business_insight':
        return 'bg-purple-100 text-purple-800';
      case 'patent_analysis':
        return 'bg-blue-100 text-blue-800';
      case 'market_research':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'processing':
        return Clock;
      case 'failed':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const getQualityStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUniqueUsers = () => {
    const users = new Set();
    reportManagementData?.reports?.forEach(report => {
      if (report.userId && report.user_email) {
        users.add(JSON.stringify({
          id: report.userId,
          email: report.user_email,
          name: report.user_name
        }));
      }
    });
    return Array.from(users).map(user => JSON.parse(user as string));
  };

  if (loading.reports && !reportManagementData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">리포트 데이터를 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // 100일간 통계 카드 데이터
  const statsCards = [
    {
      title: '총 리포트 (100일)',
      value: reportManagementData?.totalReports || 0,
      change: reportManagementData?.reportsLastMonth 
        ? `${((((reportManagementData?.reportsThisMonth || 0) - reportManagementData.reportsLastMonth) / reportManagementData.reportsLastMonth) * 100).toFixed(1)}%`
        : '+0%',
      icon: FileText,
      color: 'bg-blue-500'
    },
    {
      title: '이번 달 리포트',
      value: reportManagementData?.reportsThisMonth || 0,
      change: '+12%',
      icon: TrendingUp,
      color: 'bg-green-500'
    },
    {
      title: '총 다운로드',
      value: reportManagementData?.totalDownloads || 0,
      change: '+8%',
      icon: Download,
      color: 'bg-purple-500'
    },
    {
      title: '평균 품질 점수',
      value: (reportManagementData?.averageQuality || 0).toFixed(1),
      change: '+0.2',
      icon: Star,
      color: 'bg-yellow-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">리포트 관리</h1>
          <p className="text-gray-600">최근 100일간의 리포트 현황 및 관리</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading.reports}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading.reports ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* 100일간 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">{stat.change}</span>
              <span className="text-sm text-gray-500 ml-1">vs 지난 달</span>
            </div>
          </div>
        ))}
      </div>

      {/* 리포트 유형별 통계 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">리포트 유형별 분석</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {Object.entries(reportManagementData?.typeStats || {}).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{type}</span>
                <div className="flex items-center">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(count / (reportManagementData?.totalReports || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">상위 사용자 (리포트 생성)</h3>
            <Users className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {Object.values(reportManagementData?.userStats || {})
              .sort((a: any, b: any) => b.reportCount - a.reportCount)
              .slice(0, 5)
              .map((user: any, index) => (
              <div key={user.userId} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-900">{user.userName || user.userEmail}</span>
                  <p className="text-xs text-gray-500">{user.userEmail}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">{user.reportCount}개</span>
                  <p className="text-xs text-gray-500">평점: {user.averageQuality.toFixed(1)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="리포트 제목, 사용자, 특허번호로 검색..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 상태</option>
              <option value="completed">완료</option>
              <option value="processing">처리중</option>
              <option value="failed">실패</option>
              <option value="pending">대기</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 유형</option>
              <option value="patent_analysis">특허 분석</option>
              <option value="business_insight">비즈니스 인사이트</option>
              <option value="market_research">시장 조사</option>
            </select>

            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 품질</option>
              <option value="excellent">우수 (4.5+)</option>
              <option value="good">좋음 (3.5-4.4)</option>
              <option value="average">보통 (2.5-3.4)</option>
              <option value="poor">미흡 (2.5 미만)</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체 기간</option>
              <option value="today">오늘</option>
              <option value="week">최근 7일</option>
              <option value="month">최근 30일</option>
              <option value="100days">최근 100일</option>
            </select>
          </div>
        </div>

        {selectedReports.length > 0 && (
          <div className="mt-4 flex items-center justify-between bg-blue-50 p-3 rounded-lg">
            <span className="text-sm text-blue-700">
              {selectedReports.length}개 리포트가 선택됨
            </span>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              선택 삭제
            </button>
          </div>
        )}
      </div>

      {/* 리포트 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedReports.length === filteredReports.length && filteredReports.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  리포트 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  유형/상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  품질/다운로드
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생성일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedReports.includes(report.id)}
                      onChange={() => handleSelectReport(report.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {report.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {report.applicationNumber && `특허번호: ${report.applicationNumber}`}
                      </div>
                      <div className="text-xs text-gray-400">
                        크기: {formatFileSize(report.fileSize || 0)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {report.user_name || report.user_email}
                      </div>
                      <div className="text-sm text-gray-500">{report.user_email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(report.type)}`}>
                        {report.type}
                      </span>
                      <br />
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center">
                        {getQualityStars(report.qualityRating || 0)}
                        <span className="ml-1 text-sm text-gray-600">
                          ({(report.qualityRating || 0).toFixed(1)})
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        다운로드: {report.downloadCount}회
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewReport(report)}
                        className="text-blue-600 hover:text-blue-900"
                        title="상세 보기"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="text-green-600 hover:text-green-900"
                        title="다운로드"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="text-red-600 hover:text-red-900"
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                이전
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                다음
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  총 <span className="font-medium">{filteredReports.length}</span>개 중{' '}
                  <span className="font-medium">{startIndex + 1}</span>-
                  <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredReports.length)}</span>개 표시
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    이전
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    다음
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 리포트 상세 모달 */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">리포트 상세 정보</h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">기본 정보</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">제목:</span> {selectedReport.title}</div>
                    <div><span className="font-medium">유형:</span> {selectedReport.type}</div>
                    <div><span className="font-medium">상태:</span> {selectedReport.status}</div>
                    <div><span className="font-medium">특허번호:</span> {selectedReport.applicationNumber}</div>
                    <div><span className="font-medium">파일 크기:</span> {formatFileSize(selectedReport.fileSize || 0)}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">사용자 정보</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">이름:</span> {selectedReport.user_name}</div>
                    <div><span className="font-medium">이메일:</span> {selectedReport.user_email}</div>
                    <div><span className="font-medium">생성일:</span> {new Date(selectedReport.createdAt).toLocaleString('ko-KR')}</div>
                    <div><span className="font-medium">다운로드:</span> {selectedReport.downloadCount}회</div>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">품질 평가:</span>
                      {getQualityStars(selectedReport.qualityRating || 0)}
                      <span className="ml-1">({(selectedReport.qualityRating || 0).toFixed(1)})</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedReport.reportData && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">리포트 내용 미리보기</h4>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(selectedReport.reportData, null, 2).substring(0, 1000)}
                      {JSON.stringify(selectedReport.reportData, null, 2).length > 1000 && '...'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                닫기
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportManagement;