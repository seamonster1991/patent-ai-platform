import React, { useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { 
  Card, 
  Text, 
  Metric,
  DonutChart,
  BarChart,
  Badge,
  Flex
} from '@tremor/react';
import { 
  Search, 
  TrendingUp, 
  FileText, 
  Target,
  AlertTriangle
} from 'lucide-react';

const AdminStatistics: React.FC = () => {
  const {
    searchKeywords,
    techDistribution,
    topPatents,
    isLoading,
    fetchSearchKeywords,
    fetchTechDistribution,
    fetchTopPatents
  } = useAdminStore();

  useEffect(() => {
    fetchSearchKeywords();
    fetchTechDistribution();
    fetchTopPatents();
  }, [fetchSearchKeywords, fetchTechDistribution, fetchTopPatents]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ms-text">데이터를 불러오는 중...</div>
      </div>
    )
  }

  const getGrowthBadge = (growth: number) => {
    if (growth > 5) return <Badge color="emerald" size="xs">+{growth.toFixed(1)}%</Badge>;
    if (growth > 0) return <Badge color="yellow" size="xs">+{growth.toFixed(1)}%</Badge>;
    if (growth < -5) return <Badge color="red" size="xs">{growth.toFixed(1)}%</Badge>;
    return <Badge color="gray" size="xs">{growth.toFixed(1)}%</Badge>;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-ms-text mb-2">시장 인텔리전스</h1>
        <p className="text-gray-600">특허 검색 트렌드와 기술 분야별 인사이트를 분석합니다</p>
      </div>

      {/* Top 검색 키워드 섹션 */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Search className="h-6 w-6 text-ms-olive" />
          <h2 className="text-xl font-semibold text-ms-text">Top 검색 키워드</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 키워드 순위 테이블 */}
          <Card className="border-0 shadow-sm">
            <div className="mb-4">
              <Text className="text-lg font-semibold text-ms-text">주간 인기 키워드</Text>
              <Text className="text-gray-600">검색량 기준 Top 10</Text>
            </div>
            <div className="space-y-3">
              {searchKeywords.slice(0, 10).map((keyword, index) => (
                <div key={keyword.keyword} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-ms-olive text-white text-xs font-bold rounded">
                      {index + 1}
                    </div>
                    <span className="font-medium text-ms-text">{keyword.keyword}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">{keyword.count}회</span>
                    {getGrowthBadge(keyword.growthRate)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 키워드 검색량 차트 */}
          <Card className="border-0 shadow-sm">
            <div className="mb-4">
              <Text className="text-lg font-semibold text-ms-text">검색량 분포</Text>
              <Text className="text-gray-600">상위 키워드별 검색 빈도</Text>
            </div>
            <BarChart
              className="h-64"
              data={searchKeywords.slice(0, 8)}
              index="keyword"
              categories={["count"]}
              colors={["emerald"]}
              valueFormatter={(value) => `${value}회`}
              yAxisWidth={40}
              showAnimation={true}
              layout="vertical"
            />
          </Card>
        </div>
      </div>

      {/* 기술 분야별 분포 섹션 */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Target className="h-6 w-6 text-ms-olive" />
          <h2 className="text-xl font-semibold text-ms-text">기술 분야별 분포</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 도넛 차트 */}
          <Card className="border-0 shadow-sm">
            <div className="mb-4">
              <Text className="text-lg font-semibold text-ms-text">IPC/CPC 코드별 분석 건수</Text>
              <Text className="text-gray-600">전체 특허 분석 요청 분포</Text>
            </div>
            <DonutChart
              className="h-64"
              data={techDistribution}
              category="count"
              index="category"
              colors={["emerald", "blue", "violet", "amber", "rose"]}
              valueFormatter={(value) => `${value}건`}
              showAnimation={true}
            />
          </Card>

          {/* 분야별 상세 통계 */}
          <Card className="border-0 shadow-sm">
            <div className="mb-4">
              <Text className="text-lg font-semibold text-ms-text">분야별 상세 현황</Text>
              <Text className="text-gray-600">각 기술 분야의 분석 현황</Text>
            </div>
            <div className="space-y-4">
              {techDistribution.map((tech, index) => (
                <div key={tech.category} className="space-y-2">
                  <Flex>
                    <Text className="font-medium text-ms-text">{tech.category}</Text>
                    <Text className="text-gray-600">{tech.count}건 ({tech.percentage}%)</Text>
                  </Flex>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-ms-olive h-2 rounded-full transition-all duration-300"
                      style={{ width: `${tech.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Top 분석 특허 섹션 */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <FileText className="h-6 w-6 text-ms-olive" />
          <h2 className="text-xl font-semibold text-ms-text">Top 분석 특허</h2>
        </div>
        
        <Card className="border-0 shadow-sm">
          <div className="mb-6">
            <Text className="text-lg font-semibold text-ms-text">가장 많이 분석된 특허</Text>
            <Text className="text-gray-600">LLM 분석 요청이 많은 특허 목록</Text>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-ms-text">순위</th>
                  <th className="text-left py-3 px-4 font-semibold text-ms-text">특허번호</th>
                  <th className="text-left py-3 px-4 font-semibold text-ms-text">특허명</th>
                  <th className="text-left py-3 px-4 font-semibold text-ms-text">출원인</th>
                  <th className="text-left py-3 px-4 font-semibold text-ms-text">분석횟수</th>
                </tr>
              </thead>
              <tbody>
                {topPatents.map((patent, index) => (
                  <tr key={patent.applicationNumber} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center w-6 h-6 bg-ms-olive text-white text-xs font-bold rounded">
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-sm text-ms-text">
                      {patent.applicationNumber}
                    </td>
                    <td className="py-3 px-4 text-sm text-ms-text max-w-xs truncate">
                      {patent.title}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {patent.applicant}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <span className="font-semibold text-ms-text">{patent.analysisCount}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {topPatents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              분석된 특허 데이터가 없습니다.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminStatistics;