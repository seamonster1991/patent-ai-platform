import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import { UserIcon, GlobeAltIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

interface DailyData {
  date: string;
  count: number;
}

interface MarketComparisonProps {
  title: string;
  description?: string;
  userDailyData: DailyData[];
  marketDailyData: DailyData[];
  type: 'search' | 'report';
  period: string;
}

const MarketComparisonChart: React.FC<MarketComparisonProps> = ({
  title,
  description,
  userDailyData,
  marketDailyData,
  type,
  period
}) => {
  // Calculate totals
  const userTotal = userDailyData.reduce((sum, item) => sum + item.count, 0);
  const marketTotal = marketDailyData.reduce((sum, item) => sum + item.count, 0);
  
  // Calculate averages
  const userAverage = userTotal / userDailyData.length;
  const marketAverage = marketTotal / marketDailyData.length;
  
  // Calculate comparison percentage
  const comparisonPercentage = marketAverage > 0 
    ? ((userAverage / marketAverage) * 100) 
    : 0;
  
  // Prepare chart data (last 7 days for better visualization)
  const recentData = userDailyData.slice(-7).map(userItem => {
    const marketItem = marketDailyData.find(m => m.date === userItem.date);
    return {
      date: new Date(userItem.date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      }),
      user: userItem.count,
      market: marketItem ? Math.round(marketItem.count / 10) : 0, // Scale down market data for better comparison
      fullDate: userItem.date
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow">
          <p className="font-semibold text-gray-900 mb-2 text-sm">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-xs font-semibold mb-1">
              {entry.dataKey === 'user' ? '개인 분석' : '시장 비교'}: 
              <span className="ml-2 font-bold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // 최소화된 범례
  const CustomLegend = ({ payload }: any) => (
    <div className="flex justify-center items-center space-x-6 mt-4 mb-2">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center space-x-2">
          <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: entry.color }} />
          <span className="text-sm font-medium text-gray-800">
            {entry.dataKey === 'user' ? '개인 분석' : '시장 비교'}
          </span>
        </div>
      ))}
    </div>
  );

  const getComparisonColor = (percentage: number) => {
    if (percentage >= 100) return 'green';
    if (percentage >= 50) return 'yellow';
    return 'red';
  };

  const getComparisonIcon = (percentage: number) => {
    return percentage >= 50 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  };

  const getComparisonText = (percentage: number) => {
    if (percentage >= 100) return '평균 이상';
    if (percentage >= 50) return '평균';
    return '평균 이하';
  };

  return (
    <Card className="p-6 shadow-ms-sm">
      <div className="mb-8">
        <Title className="text-xl font-semibold text-gray-900 mb-2">{title}</Title>
        {description && (
          <Text className="text-sm text-gray-600">{description}</Text>
        )}
      </div>

      {/* Analysis Type Indicator - 개인분석 / 시장비교 */}
      <div className="flex justify-center mb-6">
        <div className="bg-ms-olive px-6 py-3 rounded-xl shadow text-white">
          <div className="flex items-center space-x-3">
            <UserIcon className="h-6 w-6 text-white" />
            <span className="text-sm font-bold">개인분석 / 시장비교</span>
            <GlobeAltIcon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      {/* Summary Statistics - 미니멀 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg border border-ms-line bg-ms-white">
          <div className="flex items-center justify-between mb-2">
            <Text className="text-xs text-gray-600">개인 분석 총계</Text>
            <UserIcon className="h-4 w-4 text-ms-olive" />
          </div>
          <Metric className="text-2xl font-bold text-gray-900 mb-1">
            {userTotal.toLocaleString('ko-KR')}
          </Metric>
          <Text className="text-xs text-gray-600">평균 {userAverage.toFixed(1)}/일</Text>
        </div>

        <div className="p-4 rounded-lg border border-ms-line bg-ms-white">
          <div className="flex items-center justify-between mb-2">
            <Text className="text-xs text-gray-600">시장 비교 총계</Text>
            <GlobeAltIcon className="h-4 w-4 text-ms-olive" />
          </div>
          <Metric className="text-2xl font-bold text-gray-900 mb-1">
            {marketTotal.toLocaleString('ko-KR')}
          </Metric>
          <Text className="text-xs text-gray-600">평균 {marketAverage.toFixed(1)}/일</Text>
        </div>

        <div className="p-4 rounded-lg border border-ms-line bg-ms-white">
          <div className="flex items-center justify-between mb-2">
            <Text className="text-xs text-gray-600">성과 비교</Text>
            {React.createElement(getComparisonIcon(comparisonPercentage), { className: 'h-4 w-4 text-ms-olive' })}
          </div>
          <Metric className="text-2xl font-bold text-gray-900 mb-1">
            {comparisonPercentage.toFixed(0)}%
          </Metric>
          <Text className="text-xs text-gray-600">{getComparisonText(comparisonPercentage)}</Text>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-4">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={recentData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              stroke="#374151"
              fontSize={14}
              tickLine={false}
              fontWeight="700"
            />
            <YAxis 
              stroke="#374151"
              fontSize={14}
              tickLine={false}
              axisLine={false}
              fontWeight="700"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Bar 
              dataKey="user" 
              fill="#34463D" 
              name="개인 분석"
              radius={[6, 6, 0, 0]}
              strokeWidth={1}
              stroke="#23302A"
            />
            <Bar 
              dataKey="market" 
              fill="#9CA3AF" 
              name="시장 비교"
              radius={[6, 6, 0, 0]}
              strokeWidth={1}
              stroke="#6B7280"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>


    </Card>
  );
};

export default MarketComparisonChart;