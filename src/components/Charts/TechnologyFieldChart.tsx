import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, Title, Text, Button, Badge } from '@tremor/react';
import { UserIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface FieldData {
  field: string;
  ipc_code: string;
  search_count?: number;
  report_count?: number;
  percentage: number;
}

interface TechnologyFieldChartProps {
  title: string;
  description?: string;
  userFields: FieldData[];
  marketFields: FieldData[];
  type: 'search' | 'report';
}

// Chromatic palette (muted but colored for better distinction)
const COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#06B6D4', // cyan
  '#D946EF', // fuchsia
  '#22C55E', // green
  '#FB7185', // rose
  '#F97316'  // orange
];

const TechnologyFieldChart: React.FC<TechnologyFieldChartProps> = ({
  title,
  description,
  userFields,
  marketFields,
  type
}) => {
  const [viewMode, setViewMode] = useState<'user' | 'market'>('user');
  
  const currentData = viewMode === 'user' ? userFields : marketFields;
  const countKey = type === 'search' ? 'search_count' : 'report_count';
  
  // N/A 항목을 필터링하고 데이터를 준비
  const filteredData = currentData.filter(item => 
    item.field && 
    item.field.toLowerCase() !== 'n/a' && 
    item.field.trim() !== '' &&
    item.field !== 'General' // General도 제거하고 싶다면
  );
  
  // Prepare data for the pie chart
  const chartData = filteredData.slice(0, 8).map((item, index) => ({
    name: item.field,
    value: item[countKey] || 0,
    percentage: item.percentage,
    ipc_code: item.ipc_code,
    color: COLORS[index % COLORS.length],
    // 짧은 라벨을 위한 축약된 이름
    shortName: item.field.length > 15 ? item.field.substring(0, 12) + '...' : item.field
  }));

  // 파이 차트 라벨: 도넛 밖에 색 점 + 리더 라인 + 여백 뒤 텍스트를 가변형으로 표시
  const renderCustomizedLabel = (props: any) => {
    const {
      cx,
      cy,
      midAngle,
      outerRadius,
      name,
      percentage,
      ipc_code,
      payload
    } = props;

    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);

    // 라벨 라인의 시작/중간/끝 좌표 계산 (도넛 외곽에서 약간 바깥으로)
    const sx = cx + outerRadius * 0.92 * cos;
    const sy = cy + outerRadius * 0.92 * sin;
    const mx = cx + (outerRadius + 12) * cos;
    const my = cy + (outerRadius + 12) * sin;
    const ex = mx + (cos >= 0 ? 18 : -18);
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    const color = payload?.color || '#374151';
    const title = name && name.length > 20 ? name.substring(0, 19) + '…' : name;
    const ipcDisplay = ipc_code && ipc_code.toLowerCase() !== 'n/a' ? ipc_code : '';
    const info = ipcDisplay ? `${ipcDisplay} · ${Math.round(percentage)}%` : `${Math.round(percentage)}%`;

    return (
      <g>
        {/* 리더 라인 */}
        <path d={`M ${sx},${sy} L ${mx},${my} L ${ex},${ey}`} stroke={color} strokeWidth={1.5} fill="none" />
        {/* 색 점 */}
        <circle cx={ex} cy={ey} r={4} fill={color} />
        {/* 텍스트 (여백 포함) */}
        <text
          x={ex + (cos >= 0 ? 8 : -8)}
          y={ey - 2}
          textAnchor={textAnchor}
          fill="#111827"
          fontSize={11}
          fontWeight={700}
        >
          {title}
        </text>
        <text
          x={ex + (cos >= 0 ? 8 : -8)}
          y={ey + 10}
          textAnchor={textAnchor}
          fill="#6B7280"
          fontSize={10}
          fontWeight={600}
        >
          {info}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm max-w-sm">
          <p className="font-semibold text-gray-900 text-sm mb-3 break-words leading-tight">{data.name}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">IPC/CPC 코드:</span>
              <span className="text-xs font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded font-semibold">
                {data.ipc_code && data.ipc_code.toLowerCase() !== 'n/a' ? data.ipc_code : '미분류'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">
                {type === 'search' ? '검색 수:' : '리포트 수:'}
              </span>
              <span className="text-xs font-bold text-gray-900">
                {data.value.toLocaleString('ko-KR')}건
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">비율:</span>
              <span className="text-xs font-bold text-gray-800">
                {data.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // 별도 리스트/레전드는 제거 (요청사항: 도넛 위에 직접 텍스트만 표시)

  return (
    <Card className="p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title className="text-lg font-semibold text-gray-900 mb-1">{title}</Title>
          {description && (
            <Text className="text-xs text-gray-600">{description}</Text>
          )}
          <Text className="text-xs text-gray-700 mt-1">
            {viewMode === 'user' ? '나의 데이터' : '시장 비교 데이터'}
          </Text>
        </div>
        
        <div className="flex space-x-3">
          <Button
            size="sm"
            variant={viewMode === 'user' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('user')}
            icon={UserIcon}
            className="font-semibold"
          >
            내 데이터
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'market' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('market')}
            icon={GlobeAltIcon}
            className="font-semibold"
          >
            시장 데이터
          </Button>
        </div>
      </div>


      {chartData.length > 0 ? (
        <div className="flex flex-col">
            <Text className="text-base font-semibold text-gray-900 mb-4 text-center">
              기술 분야별 분포
            </Text>
            <ResponsiveContainer width="100%" height={380}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  innerRadius={85}
                  outerRadius={150}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={1}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-80 text-gray-500 bg-gray-50 rounded-lg">
          <div className="text-center">
            <Text className="text-xl font-bold mb-3">📭 데이터가 없습니다</Text>
            <Text className="text-base">
              {viewMode === 'user' 
                ? `선택한 기간에 ${type === 'search' ? '검색' : '리포트'} 활동이 없습니다`
                : '시장 데이터를 사용할 수 없습니다'
              }
            </Text>
          </div>
        </div>
      )}
    </Card>
  );
};

export default TechnologyFieldChart;