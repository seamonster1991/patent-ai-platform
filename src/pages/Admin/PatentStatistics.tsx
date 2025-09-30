import React, { useEffect, useState } from 'react';
import { 
  Search, 
  TrendingUp, 
  FileText, 
  Building2,
  Hash,
  Award,
  RefreshCw,
  Download
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import AdminLayout from '../../components/Layout/AdminLayout';

interface SearchKeyword {
  keyword: string;
  searchCount: number;
  weeklyGrowth: number;
  rank: number;
}

interface TechnologyDistribution {
  code: string;
  name: string;
  count: number;
  percentage: number;
}

interface PopularPatent {
  patentNumber: string;
  title: string;
  analysisCount: number;
  lastAnalyzed: string;
  category: string;
}

interface CompetitorMention {
  company: string;
  mentions: number;
  growth: number;
  category: string;
}

interface PatentStatisticsData {
  topKeywords: SearchKeyword[];
  technologyDistribution: TechnologyDistribution[];
  popularPatents: PopularPatent[];
  competitorMentions: CompetitorMention[];
  totalSearches: number;
  totalAnalyses: number;
}

const PatentStatistics: React.FC = () => {
  const [data, setData] = useState<PatentStatisticsData>({
    topKeywords: [
      { keyword: '인공지능', searchCount: 2847, weeklyGrowth: 23.5, rank: 1 },
      { keyword: '반도체', searchCount: 2156, weeklyGrowth: 8.2, rank: 2 },
      { keyword: '배터리', searchCount: 1923, weeklyGrowth: 45.7, rank: 3 },
      { keyword: '자율주행', searchCount: 1678, weeklyGrowth: 12.3, rank: 4 },
      { keyword: '5G', searchCount: 1534, weeklyGrowth: -2.1, rank: 5 },
      { keyword: '바이오', searchCount: 1289, weeklyGrowth: 18.9, rank: 6 },
      { keyword: '블록체인', searchCount: 1156, weeklyGrowth: 6.7, rank: 7 },
      { keyword: '메타버스', searchCount: 987, weeklyGrowth: 34.2, rank: 8 },
      { keyword: '양자컴퓨팅', searchCount: 834, weeklyGrowth: 67.8, rank: 9 },
      { keyword: '로봇', searchCount: 756, weeklyGrowth: 15.4, rank: 10 }
    ],
    technologyDistribution: [
      { code: 'G06F', name: '전기적 디지털 데이터 처리', count: 3456, percentage: 28.7 },
      { code: 'H01L', name: '반도체 장치', count: 2789, percentage: 23.2 },
      { code: 'H04W', name: '무선 통신 네트워크', count: 1923, percentage: 16.0 },
      { code: 'G06N', name: '특정 수학적 모델 기반 컴퓨터 시스템', count: 1567, percentage: 13.0 },
      { code: 'H01M', name: '화학적 전기 발생 요소', count: 1234, percentage: 10.3 },
      { code: 'G06Q', name: '데이터 처리 시스템', count: 1045, percentage: 8.7 },
      { code: '기타', name: '기타 분야', count: 12, percentage: 0.1 }
    ],
    popularPatents: [
      {
        patentNumber: 'KR10-2023-0123456',
        title: 'AI 기반 자율주행 시스템의 실시간 객체 인식 방법',
        analysisCount: 89,
        lastAnalyzed: '2024-12-20',
        category: '인공지능'
      },
      {
        patentNumber: 'KR10-2023-0098765',
        title: '고효율 리튬이온 배터리 전해질 조성물',
        analysisCount: 76,
        lastAnalyzed: '2024-12-19',
        category: '배터리'
      },
      {
        patentNumber: 'KR10-2023-0087654',
        title: '5G 네트워크 기반 초저지연 통신 시스템',
        analysisCount: 68,
        lastAnalyzed: '2024-12-20',
        category: '통신'
      },
      {
        patentNumber: 'KR10-2023-0076543',
        title: '양자 암호화를 이용한 블록체인 보안 시스템',
        analysisCount: 54,
        lastAnalyzed: '2024-12-18',
        category: '블록체인'
      },
      {
        patentNumber: 'KR10-2023-0065432',
        title: '메타버스 환경에서의 햅틱 피드백 장치',
        analysisCount: 47,
        lastAnalyzed: '2024-12-19',
        category: '메타버스'
      }
    ],
    competitorMentions: [
      { company: '삼성전자', mentions: 1247, growth: 15.3, category: '반도체/전자' },
      { company: 'LG에너지솔루션', mentions: 892, growth: 28.7, category: '배터리' },
      { company: 'SK하이닉스', mentions: 756, growth: 12.1, category: '반도체' },
      { company: '현대자동차', mentions: 634, growth: 22.4, category: '자동차' },
      { company: 'NAVER', mentions: 523, growth: 45.6, category: 'IT/플랫폼' }
    ],
    totalSearches: 45678,
    totalAnalyses: 12345
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const fetchPatentStatistics = async () => {
      try {
        // TODO: Implement actual API calls to fetch patent statistics
        // For now, using mock data
        setTimeout(() => {
          setIsLoading(false);
          setLastUpdated(new Date());
        }, 1000);
      } catch (error) {
        console.error('Error fetching patent statistics:', error);
        setIsLoading(false);
      }
    };

    fetchPatentStatistics();
    
    // Auto-refresh every 15 minutes
    const interval = setInterval(fetchPatentStatistics, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setLastUpdated(new Date());
    }, 1000);
  };

  const exportData = () => {
    // TODO: Implement export functionality
    console.log('Exporting patent statistics data...');
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">
              특허 주제 및 리포트 통계
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              검색 키워드, 기술 분야 분포 및 인기 특허 분석
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <div className="text-sm text-gray-400">
              마지막 업데이트: {lastUpdated.toLocaleString('ko-KR')}
            </div>
            <button
              onClick={exportData}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>내보내기</span>
            </button>
            <button
              onClick={refreshData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-blue-500 text-blue-100">
                    <Search className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      총 검색 수
                    </dt>
                    <dd className="text-2xl font-semibold text-white">
                      {data.totalSearches.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-green-500 text-green-100">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      총 분석 수
                    </dt>
                    <dd className="text-2xl font-semibold text-white">
                      {data.totalAnalyses.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-purple-500 text-purple-100">
                    <Hash className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      고유 키워드
                    </dt>
                    <dd className="text-2xl font-semibold text-white">
                      {data.topKeywords.length * 15}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-yellow-500 text-yellow-100">
                    <Award className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      인기 특허
                    </dt>
                    <dd className="text-2xl font-semibold text-white">
                      {data.popularPatents.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top 10 Search Keywords */}
        <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">Top 10 검색 키워드</h3>
            <p className="text-sm text-gray-400">주간 검색량 및 성장률 포함</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    순위
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    키워드
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    검색량
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    주간 성장률
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {data.topKeywords.map((keyword) => (
                  <tr key={keyword.rank} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                          keyword.rank <= 3 ? 'bg-yellow-500 text-yellow-900' : 'bg-gray-600 text-gray-200'
                        }`}>
                          {keyword.rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{keyword.keyword}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{keyword.searchCount.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center text-sm font-medium ${
                        keyword.weeklyGrowth > 0 ? 'text-green-400' : 
                        keyword.weeklyGrowth < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {keyword.weeklyGrowth > 0 && <TrendingUp className="h-4 w-4 mr-1" />}
                        {keyword.weeklyGrowth > 0 ? '+' : ''}{keyword.weeklyGrowth}%
                        {keyword.weeklyGrowth > 30 && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            급부상
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Technology Distribution */}
          <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">기술 분야 분포 (IPC/CPC)</h3>
              <p className="text-sm text-gray-400">특허 분류 코드별 분석 현황</p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.technologyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {data.technologyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-1 gap-2">
                {data.technologyDistribution.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="text-white font-medium">{item.code}</span>
                      <span className="text-gray-400">{item.name}</span>
                    </div>
                    <span className="text-white">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Competitor Mentions */}
          <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">경쟁사 언급 빈도</h3>
              <p className="text-sm text-gray-400">LLM 리포트에서 언급된 주요 기업</p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.competitorMentions} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" />
                  <YAxis dataKey="company" type="category" stroke="#9CA3AF" width={100} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }} 
                  />
                  <Bar 
                    dataKey="mentions" 
                    fill="#8B5CF6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Most Analyzed Patents */}
        <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">가장 많이 분석된 특허</h3>
            <p className="text-sm text-gray-400">LLM 분석 요청이 많은 인기 특허</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    특허번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    분석 횟수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    분야
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    최근 분석
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {data.popularPatents.map((patent, index) => (
                  <tr key={index} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-400">{patent.patentNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white max-w-md truncate">{patent.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-white">{patent.analysisCount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {patent.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">{patent.lastAnalyzed}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PatentStatistics;