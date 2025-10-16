import React from 'react';
import { Bar } from 'react-chartjs-2';

interface ConversionData {
  totalLogins?: number;
  totalSearches?: number;
  totalReports: number;
  conversionRate: number;
}

interface ConversionRateChartProps {
  title: string;
  data: ConversionData;
  type: 'login' | 'search';
}

const ConversionRateChart: React.FC<ConversionRateChartProps> = ({
  title,
  data,
  type
}) => {
  const totalBase = type === 'login' ? data.totalLogins || 0 : data.totalSearches || 0;
  const baseLabel = type === 'login' ? '총 로그인수' : '총 검색수';
  
  const chartData = {
    labels: [baseLabel, '리포트 생성수', '전환율'],
    datasets: [
      {
        label: '수량',
        data: [totalBase, data.totalReports, 0], // 전환율은 별도 축
        backgroundColor: [
          'rgba(99, 102, 241, 0.6)',
          'rgba(16, 185, 129, 0.6)',
          'rgba(0, 0, 0, 0)', // 전환율은 투명
        ],
        borderColor: [
          'rgb(99, 102, 241)',
          'rgb(16, 185, 129)',
          'rgba(0, 0, 0, 0)',
        ],
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        label: '전환율 (%)',
        data: [0, 0, data.conversionRate], // 전환율만 표시
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const, // 가로 막대그래프
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
          filter: function(legendItem: any) {
            // 빈 데이터셋은 범례에서 제외
            return legendItem.text !== '수량' || legendItem.datasetIndex === 0;
          }
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
            const value = context.parsed.x;
            
            if (label === '전환율 (%)') {
              return `${label}: ${value.toFixed(2)}%`;
            }
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
          text: '수량',
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
      x1: {
        type: 'linear' as const,
        display: false,
        position: 'top' as const,
        max: 100, // 전환율은 최대 100%
        ticks: {
          beginAtZero: true,
          stepSize: 10,
          maxTicksLimit: 11,
        },
      },
      y: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 12,
          },
        },
      },
      y1: {
        type: 'category' as const,
        display: false,
        position: 'right' as const,
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="mb-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">
              {totalBase.toLocaleString()}
            </div>
            <div className="text-gray-600">{baseLabel}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {data.totalReports.toLocaleString()}
            </div>
            <div className="text-gray-600">리포트 생성수</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">
              {data.conversionRate.toFixed(2)}%
            </div>
            <div className="text-gray-600">전환율</div>
          </div>
        </div>
      </div>
      <div className="h-40">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default ConversionRateChart;