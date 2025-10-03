import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface FieldDistributionChartProps {
  data: Array<{
    field: string;
    count: number;
  }>;
  loading?: boolean;
}

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
];

export default function FieldDistributionChart({ data, loading }: FieldDistributionChartProps) {
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
        검색 분야 데이터가 없습니다.
      </div>
    );
  }

  const chartData = {
    labels: data.map(item => item.field),
    datasets: [
      {
        data: data.map(item => item.count),
        backgroundColor: COLORS.slice(0, data.length),
        borderColor: COLORS.slice(0, data.length).map(color => color),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 12,
          padding: 15,
        },
      },
      title: {
        display: true,
        text: '검색 분야 분포',
      },
    },
  };

  return (
    <div className="h-64">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}