import React from 'react';
import { Chart } from 'react-chartjs-2';

interface TrendData {
  date: string;
  count: number;
}

interface TrendAnalysisChartProps {
  title: string;
  userTrends: TrendData[];
  marketTrends: TrendData[];
  marketTotal: number;
  type: 'search' | 'report';
}

const TrendAnalysisChart: React.FC<TrendAnalysisChartProps> = ({
  title,
  userTrends,
  marketTrends,
  marketTotal,
  type
}) => {
  const labels = userTrends.map(item => {
    const date = new Date(item.date);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  // 총 개수 계산
  const userTotal = userTrends.reduce((sum, item) => sum + item.count, 0);

  const data = {
    labels,
    datasets: [
      {
        type: 'bar' as const,
        label: type === 'search' ? '사용자 검색수' : '사용자 리포트 생성수',
        data: userTrends.map(item => item.count),
        backgroundColor: type === 'search' ? 'rgba(59, 130, 246, 0.6)' : 'rgba(16, 185, 129, 0.6)',
        borderColor: type === 'search' ? 'rgb(59, 130, 246)' : 'rgb(16, 185, 129)',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: '시장 평균',
        data: marketTrends.map(item => item.count),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        color: '#1f2937',
      },
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toLocaleString()}`;
          }
        }
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '날짜',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 10,
          font: {
            size: 10,
          },
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: type === 'search' ? '검색 수' : '리포트 수',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)',
        },
        ticks: {
          beginAtZero: true,
          callback: function(value: any) {
            return value.toLocaleString();
          },
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: '시장 평균',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          beginAtZero: true,
          callback: function(value: any) {
            return value.toLocaleString();
          },
        },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {/* 텍스트 오버레이 */}
      <div className="mb-4 text-center">
        <div className="inline-flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${type === 'search' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
            <span className="text-sm font-medium text-gray-700">
              사용자: {userTotal.toLocaleString()}건
            </span>
          </div>
          <div className="w-px h-4 bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-sm font-medium text-gray-700">
              시장평균: {marketTotal.toLocaleString()}건
            </span>
          </div>
        </div>
      </div>
      <div className="h-80">
        <Chart type="bar" data={data} options={options} />
      </div>
    </div>
  );
};

export default TrendAnalysisChart;