import React, { useState, useEffect } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { 
  Search, 
  TrendingUp, 
  FileText, 
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Hash
} from 'lucide-react';

// 더미 데이터
const topKeywords = [
  { keyword: '인공지능', searches: 1247, growth: 23.5 },
  { keyword: '반도체', searches: 892, growth: -5.2 },
  { keyword: '배터리', searches: 756, growth: 18.7 },
  { keyword: '자율주행', searches: 634, growth: 31.2 },
  { keyword: '5G', searches: 523, growth: -12.3 },
  { keyword: '바이오', searches: 445, growth: 8.9 },
  { keyword: '로봇', searches: 387, growth: 15.4 },
  { keyword: '블록체인', searches: 298, growth: -18.6 },
  { keyword: '양자컴퓨팅', searches: 234, growth: 42.1 },
  { keyword: '메타버스', searches: 189, growth: -25.7 }
];

const technologyDistribution = [
  { name: 'G06F (컴퓨팅)', value: 28.5, color: '#78716c' },
  { name: 'H01L (반도체)', value: 22.3, color: '#a8a29e' },
  { name: 'A61K (의약)', value: 15.7, color: '#d6d3d1' },
  { name: 'C07D (화학)', value: 12.1, color: '#e7e5e4' },
  { name: 'H04W (무선통신)', value: 9.8, color: '#f5f5f4' },
  { name: '기타', value: 11.6, color: '#fafaf9' }
];

const topPatents = [
  { 
    patentNo: 'KR10-2023-0145678', 
    title: 'AI 기반 자율주행 제어 시스템', 
    applicant: '현대자동차',
    analysisCount: 45,
    lastAnalyzed: '2024-12-21'
  },
  { 
    patentNo: 'KR10-2023-0134567', 
    title: '차세대 배터리 관리 시스템', 
    applicant: 'LG에너지솔루션',
    analysisCount: 38,
    lastAnalyzed: '2024-12-20'
  },
  { 
    patentNo: 'KR10-2023-0123456', 
    title: '5G 기반 IoT 보안 프로토콜', 
    applicant: '삼성전자',
    analysisCount: 32,
    lastAnalyzed: '2024-12-21'
  },
  { 
    patentNo: 'KR10-2023-0112345', 
    title: '양자 암호화 통신 방법', 
    applicant: 'SK텔레콤',
    analysisCount: 28,
    lastAnalyzed: '2024-12-19'
  },
  { 
    patentNo: 'KR10-2023-0101234', 
    title: '메타버스 환경 최적화 기술', 
    applicant: '네이버',
    analysisCount: 24,
    lastAnalyzed: '2024-12-20'
  }
];

const StatisticsModule: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  const KeywordCard: React.FC<{
    keyword: string;
    searches: number;
    growth: number;
    rank: number;
  }> = ({ keyword, searches, growth, rank }) => {
    const isPositive = growth > 0;
    
    return (
      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
            <span className="text-sm font-medium text-stone-700">{rank}</span>
          </div>
          <div>
            <p className="font-medium text-stone-900">{keyword}</p>
            <p className="text-sm text-stone-500">{searches.toLocaleString()}회 검색</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isPositive ? (
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-sm font-medium ${
            isPositive ? 'text-green-500' : 'text-red-500'
          }`}>
            {Math.abs(growth).toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  const PatentCard: React.FC<{
    patent: typeof topPatents[0];
  }> = ({ patent }) => {
    return (
      <div className="p-4 bg-white rounded-lg border border-gray-100">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Hash className="h-3 w-3 text-stone-500" />
                <span className="text-xs font-mono text-stone-500">{patent.patentNo}</span>
              </div>
              <h4 className="font-medium text-stone-900 text-sm leading-tight">
                {patent.title}
              </h4>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-stone-900">{patent.analysisCount}</p>
              <p className="text-xs text-stone-500">분석</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-stone-500">
            <div className="flex items-center space-x-1">
              <Building2 className="h-3 w-3" />
              <span>{patent.applicant}</span>
            </div>
            <span>최근: {patent.lastAnalyzed}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* 페이지 헤더 */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-stone-900">시장 인텔리전스</h2>
        <p className="text-stone-600">특허 검색 패턴과 기술 동향을 분석합니다</p>
      </div>

      {/* 기간 선택 */}
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-stone-700">분석 기간:</span>
        <div className="flex space-x-1">
          {[
            { key: 'week', label: '주간' },
            { key: 'month', label: '월간' },
            { key: 'quarter', label: '분기' }
          ].map((period) => (
            <button
              key={period.key}
              onClick={() => setSelectedPeriod(period.key as any)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedPeriod === period.key
                  ? 'bg-stone-800 text-white'
                  : 'bg-gray-100 text-stone-600 hover:bg-gray-200'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* 상위 검색 키워드 */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Search className="h-5 w-5 text-stone-600" />
          <h3 className="text-lg font-medium text-stone-900">인기 검색 키워드</h3>
          <span className="text-sm text-stone-500">({selectedPeriod === 'week' ? '주간' : selectedPeriod === 'month' ? '월간' : '분기'} 기준)</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {topKeywords.slice(0, 10).map((item, index) => (
            <KeywordCard
              key={item.keyword}
              keyword={item.keyword}
              searches={item.searches}
              growth={item.growth}
              rank={index + 1}
            />
          ))}
        </div>
      </div>

      {/* 기술 분야별 분포 */}
      <div className="bg-white rounded-lg p-6 border border-gray-100">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-stone-600" />
            <h3 className="text-lg font-medium text-stone-900">기술 분야별 분포</h3>
            <span className="text-sm text-stone-500">(IPC/CPC 코드 기준)</span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={technologyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {technologyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value}%`, '비율']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3">
              {technologyDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-stone-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-stone-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 인기 분석 특허 */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-stone-600" />
          <h3 className="text-lg font-medium text-stone-900">인기 분석 특허</h3>
          <span className="text-sm text-stone-500">(LLM 분석 요청 기준)</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topPatents.map((patent, index) => (
            <PatentCard key={patent.patentNo} patent={patent} />
          ))}
        </div>
      </div>

      {/* 추가 인사이트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-100">
          <h3 className="text-lg font-medium text-stone-900 mb-4">트렌드 인사이트</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-stone-900">AI 기술 급성장</p>
                <p className="text-xs text-stone-600">인공지능 관련 검색이 전월 대비 23.5% 증가</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-stone-900">자율주행 관심 증대</p>
                <p className="text-xs text-stone-600">자율주행 특허 분석 요청이 31.2% 증가</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-amber-400 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-stone-900">메타버스 관심 감소</p>
                <p className="text-xs text-stone-600">메타버스 관련 검색이 25.7% 감소</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-100">
          <h3 className="text-lg font-medium text-stone-900 mb-4">주요 출원인</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-700">삼성전자</span>
              <span className="text-sm font-medium text-stone-900">127건</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-700">LG전자</span>
              <span className="text-sm font-medium text-stone-900">89건</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-700">현대자동차</span>
              <span className="text-sm font-medium text-stone-900">76건</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-700">SK하이닉스</span>
              <span className="text-sm font-medium text-stone-900">64건</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-700">네이버</span>
              <span className="text-sm font-medium text-stone-900">52건</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsModule;