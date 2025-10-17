import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';

interface PatentField {
  rank: number;
  field: string;
  count: number;
  percentage: string;
  trend?: string;
  trendValue?: string;
}

interface TopPatentFieldsData {
  success: boolean;
  data: {
    topFields: PatentField[];
    totalReports: number;
    totalFields: number;
    lastUpdated: string;
  };
}

interface PatentFieldData {
  rank: number;
  field_name: string;
  count: number;
  percentage?: number;
}

interface TopPatentFieldsChartProps {
  data?: PatentFieldData[];
  loading?: boolean;
  period?: string;
  limit?: number;
}

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
  '#ff00ff', '#00ffff', '#ff0000', '#0000ff', '#ffff00'
];

const TopPatentFieldsChart: React.FC<TopPatentFieldsChartProps> = ({ 
  data: propData,
  loading: propLoading = false,
  period = '30d', 
  limit = 10 
}) => {
  const [apiData, setApiData] = useState<TopPatentFieldsData | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // props로 데이터가 전달되지 않은 경우에만 API 호출
  useEffect(() => {
    if (!propData) {
      const fetchData = async () => {
        try {
          setApiLoading(true);
          setError(null);
          
          const response = await fetch(`/api/dashboard/top-patent-fields?period=${period}&limit=${limit}`);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result = await response.json();
          console.log('Patent fields API response:', result);
          setApiData(result);
        } catch (err) {
          console.error('Error fetching patent fields data:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch data');
        } finally {
          setApiLoading(false);
        }
      };

      fetchData();
    }
  }, [period, limit, propData]);

  // 사용할 데이터와 로딩 상태 결정
  const loading = propData ? propLoading : apiLoading;
  
  // propData가 배열인지 확인하고 안전하게 처리
  const safeData = propData && Array.isArray(propData) ? propData : [];
  
  const data = propData && Array.isArray(propData) ? { 
    success: true, 
    data: { 
      topFields: safeData.map(item => ({
        rank: item.rank,
        field: item.field_name,
        count: item.count,
        percentage: item.percentage ? `${item.percentage.toFixed(1)}%` : `${((item.count / (safeData.reduce((sum, d) => sum + d.count, 0) || 1)) * 100).toFixed(1)}%`
      })),
      totalReports: safeData.reduce((sum, item) => sum + item.count, 0),
      totalFields: safeData.length,
      lastUpdated: new Date().toISOString()
    }
  } : apiData;

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            TOP 10 특허 분야 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data || !data.success) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            TOP 10 특허 분야 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 py-8">
            {error || '데이터를 불러올 수 없습니다.'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.data.topFields.map((field, index) => ({
    ...field,
    field_name: field.field,
    fill: COLORS[index % COLORS.length]
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          TOP 10 특허 분야 분석
        </CardTitle>
        <CardDescription>
          특허 분야별 분석 결과 (총 {data.data.totalReports}개 리포트 분석, {data.data.totalFields}개 분야)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bar" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bar" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              막대 차트
            </TabsTrigger>
            <TabsTrigger value="pie" className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              원형 차트
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="bar" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="field_name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${value}개 (${chartData.find(d => d.count === value)?.percentage}%)`,
                      '리포트 수'
                    ]}
                    labelFormatter={(label) => `분야: ${label}`}
                  />
                  <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="pie" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ field_name, percentage }) => `${field_name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value}개 (${props.payload.percentage}%)`,
                      '리포트 수'
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        {/* 요약 정보 */}
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">가장 인기 분야</div>
              <div className="text-lg font-bold text-blue-800">
                {data.data.topFields[0]?.field || 'N/A'}
              </div>
              <div className="text-sm text-blue-600">
                {data.data.topFields[0]?.count}개 ({data.data.topFields[0]?.percentage}%)
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">분석된 분야 수</div>
              <div className="text-lg font-bold text-green-800">
                {data.data.topFields.length}개
              </div>
              <div className="text-sm text-green-600">
                총 필드: {data.data.totalFields}개
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">총 분석 리포트</div>
              <div className="text-lg font-bold text-purple-800">
                {data.data.totalReports.toLocaleString()}개
              </div>
              <div className="text-sm text-purple-600">
                실시간 데이터
              </div>
            </div>
          </div>

          {/* 분야별 태그 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">TOP 5 특허 분야</h4>
            <div className="flex flex-wrap gap-2">
              {data.data.topFields.slice(0, 5).map((field, index) => (
                <Badge 
                  key={field.field} 
                  variant="default"
                  className="text-xs"
                  style={{ borderColor: COLORS[index % COLORS.length] }}
                >
                  {field.field}: {field.count}개
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* 메타데이터 */}
        <div className="mt-4 text-xs text-gray-500 border-t pt-4">
          <div className="flex items-center justify-between">
            <span>최종 업데이트: {new Date(data.data.lastUpdated).toLocaleString('ko-KR')}</span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              실시간 업데이트
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TopPatentFieldsChart;