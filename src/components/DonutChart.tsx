import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';

interface ChartDataItem {
  label: string;
  value: number;
  percentage: string;
}

interface DonutChartProps {
  title: string;
  data: ChartDataItem[];
  colorPalette?: string[];
}

// 기본 색상 팔레트들
const colorPalettes = {
  blue: [
    '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE',
    '#1E40AF', '#2563EB', '#3730A3', '#4338CA', '#5B21B6'
  ],
  green: [
    '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5',
    '#059669', '#047857', '#065F46', '#064E3B', '#022C22'
  ],
  purple: [
    '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE',
    '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95', '#3730A3'
  ],
  orange: [
    '#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7',
    '#D97706', '#B45309', '#92400E', '#78350F', '#451A03'
  ]
};

const DonutChart: React.FC<DonutChartProps> = ({ 
  title, 
  data, 
  colorPalette 
}) => {
  // 색상 팔레트 선택 (제목에 따라 다른 색상 사용)
  const getColorPalette = (): string[] => {
    if (colorPalette && Array.isArray(colorPalette)) return colorPalette;
    
    if (title.includes('개인 검색')) return colorPalettes.blue;
    if (title.includes('시장 검색')) return colorPalettes.green;
    if (title.includes('개인 리포트')) return colorPalettes.purple;
    if (title.includes('시장 리포트')) return colorPalettes.orange;
    
    return colorPalettes.blue;
  };

  const colors = getColorPalette();

  // Chart.js 데이터 구성
  const chartData = {
    labels: data.map(item => item.label),
    datasets: [
      {
        data: data.map(item => item.value),
        backgroundColor: colors.slice(0, data.length),
        borderColor: colors.slice(0, data.length).map(color => color),
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 4
      }
    ]
  };

  // Chart.js 옵션 설정
  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value}회 (${percentage}%)`;
          }
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1
      }
    },
    cutout: '60%',
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000
    }
  };

  // 라벨 위치 계산 함수
  const calculateLabelPosition = (index: number, total: number, radius: number = 120) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const labelRadius = radius + 40; // 도넛 차트 외곽에서 40px 떨어진 위치
    const x = Math.cos(angle) * labelRadius;
    const y = Math.sin(angle) * labelRadius;
    return { x, y, angle };
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">
        {title}
      </h3>
      
      <div className="flex flex-col items-center">
        {/* 도넛 차트와 라벨 오버레이 */}
        <div className="relative">
          <div className="h-80 w-80 flex items-center justify-center">
            <Doughnut data={chartData} options={options} />
          </div>
          
          {/* 화살표와 라벨 오버레이 */}
          <div className="absolute inset-0 pointer-events-none">
            {data.slice(0, 5).map((item, index) => {
              const { x, y, angle } = calculateLabelPosition(index, Math.min(data.length, 5));
              const isRightSide = x > 0;
              
              return (
                <div
                  key={index}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                  }}
                >
                  {/* 화살표 선 */}
                  <div
                    className="absolute w-8 h-0.5"
                    style={{
                      backgroundColor: colors[index % colors.length],
                      transform: `rotate(${angle}rad)`,
                      transformOrigin: isRightSide ? 'left center' : 'right center',
                      left: isRightSide ? '-32px' : '0px',
                      top: '-1px'
                    }}
                  />
                  
                  {/* 라벨 */}
                  <div
                    className={`absolute whitespace-nowrap ${
                      isRightSide ? 'left-0' : 'right-0'
                    }`}
                    style={{
                      top: '-12px',
                      ...(isRightSide ? { left: '8px' } : { right: '8px' })
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colors[index % colors.length] }}
                      />
                      <div className="text-xs">
                        <div className="font-medium text-gray-800 truncate max-w-24">
                          {item.label}
                        </div>
                        <div className="text-gray-500">
                          {item.value}건 ({item.percentage})
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonutChart;