import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, Title, Text } from '@tremor/react';

interface DailyData {
  date: string;
  count: number;
}

interface TrendChartProps {
  title: string;
  description?: string;
  data: DailyData[];
  marketData?: DailyData[];
  dataKey?: string;
  dataLabel?: string;
  marketLabel?: string;
  color?: string;
  marketColor?: string;
  height?: number;
}

const TrendChart: React.FC<TrendChartProps> = ({
  title,
  description,
  data,
  marketData,
  dataKey = 'count',
  dataLabel = '내 활동',
  marketLabel = '시장 평균',
  color = '#3B82F6',
  marketColor = '#10B981',
  height = 300
}) => {
  // Combine user and market data by date
  // If user data is empty but market data exists, use market data as base
  const baseData = data.length > 0 ? data : (marketData || []);
  const combinedData = baseData.map(baseItem => {
    const userItem = data.find(u => u.date === baseItem.date);
    const marketItem = marketData?.find(m => m.date === baseItem.date);
    return {
      date: baseItem.date,
      user: userItem ? userItem[dataKey as keyof DailyData] : 0,
      market: marketItem ? marketItem[dataKey as keyof DailyData] : 0,
      formattedDate: new Date(baseItem.date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      })
    };
  });

  // Show empty state if no data at all
  if (combinedData.length === 0) {
    return (
      <Card className="p-6">
        <div className="mb-4">
          <Title className="text-lg font-semibold text-gray-900">{title}</Title>
          {description && (
            <Text className="text-sm text-gray-600 mt-1">{description}</Text>
          )}
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <Text className="text-sm">표시할 데이터가 없습니다</Text>
            <Text className="text-xs mt-1">활동을 시작하면 트렌드가 표시됩니다</Text>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <Title className="text-lg font-semibold text-gray-900">{title}</Title>
        {description && (
          <Text className="text-sm text-gray-600 mt-1">{description}</Text>
        )}
        {data.length === 0 && marketData && marketData.length > 0 && (
          <Text className="text-xs text-amber-600 mt-1">
            ⚠️ 개인 활동 데이터가 없어 시장 평균만 표시됩니다
          </Text>
        )}
      </div>
      
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={combinedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="formattedDate" 
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            labelFormatter={(label) => `날짜: ${label}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="user" 
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
            name={dataLabel}
          />
          {marketData && (
            <Line 
              type="monotone" 
              dataKey="market" 
              stroke={marketColor}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: marketColor, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: marketColor, strokeWidth: 2 }}
              name={marketLabel}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default TrendChart;