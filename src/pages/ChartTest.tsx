import React, { useState, useEffect } from 'react';
import { Grid, Card, Title, Text } from '@tremor/react';
import DonutChart from '@/components/DonutChart';

interface ChartData {
  personalSearch: {
    title: string;
    data: Array<{ label: string; value: number; percentage: string }>;
  };
  marketSearch: {
    title: string;
    data: Array<{ label: string; value: number; percentage: string }>;
  };
  personalReport: {
    title: string;
    data: Array<{ label: string; value: number; percentage: string }>;
  };
  marketReport: {
    title: string;
    data: Array<{ label: string; value: number; percentage: string }>;
  };
}

export default function ChartTest() {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        console.log('🔄 [ChartTest] 차트 데이터 로딩 시작...');
        const response = await fetch('/api/chart-data');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ [ChartTest] 차트 데이터 로딩 성공:', data);
        setChartData(data);
      } catch (err) {
        console.error('❌ [ChartTest] 차트 데이터 로딩 실패:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <Title>차트 테스트</Title>
        <Text>차트 데이터를 로딩 중입니다...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Title>차트 테스트</Title>
        <Text className="text-red-500">오류: {error}</Text>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="p-6">
        <Title>차트 테스트</Title>
        <Text>차트 데이터가 없습니다.</Text>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <Title>기술 분야 분포 도넛 차트 테스트</Title>
        <Text>4개의 도넛 차트가 표시됩니다.</Text>
      </div>

      <Grid numItems={1} numItemsSm={2} numItemsLg={2} className="gap-6">
        <Card>
          <DonutChart
            title={chartData.personalSearch.title}
            data={chartData.personalSearch.data}
            colorPalette={['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE']}
          />
        </Card>

        <Card>
          <DonutChart
            title={chartData.marketSearch.title}
            data={chartData.marketSearch.data}
            colorPalette={['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5']}
          />
        </Card>

        <Card>
          <DonutChart
            title={chartData.personalReport.title}
            data={chartData.personalReport.data}
            colorPalette={['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE']}
          />
        </Card>

        <Card>
          <DonutChart
            title={chartData.marketReport.title}
            data={chartData.marketReport.data}
            colorPalette={['#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7']}
          />
        </Card>
      </Grid>
    </div>
  );
}