import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface HourlyActivityChartProps {
  data: Array<{
    hour: number;
    count: number;
  }>;
  loading?: boolean;
}

export default function HourlyActivityChart({ data, loading }: HourlyActivityChartProps) {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-secondary-500">
        시간대별 활동 데이터가 없습니다.
      </div>
    );
  }

  const chartData = {
    labels: data.map(item => `${item.hour}시`),
    datasets: [
      {
        label: '활동 횟수',
        data: data.map(item => item.count),
        backgroundColor: data.map(item => 
          item.count > 0 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(156, 163, 175, 0.3)'
        ),
        borderColor: data.map(item => 
          item.count > 0 ? 'rgb(59, 130, 246)' : 'rgb(156, 163, 175)'
        ),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: '시간대별 활동 분포',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
      x: {
        ticks: {
          maxRotation: 45,
        },
      },
    },
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
}