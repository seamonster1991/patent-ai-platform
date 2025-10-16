import React from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface TrendData {
  date: string;
  value: number;
}

interface TrendChartProps {
  searchTrends: TrendData[];
  reportTrends: TrendData[];
  height?: number;
  className?: string;
}

const TrendChart: React.FC<TrendChartProps> = ({
  searchTrends,
  reportTrends,
  height = 300,
  className = ''
}) => {
  // Combine and format data for the chart
  const chartData = React.useMemo(() => {
    const dateMap = new Map();
    
    // Add search data
    searchTrends.forEach(item => {
      const date = new Date(item.date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      });
      dateMap.set(item.date, {
        date,
        searches: item.value,
        reports: 0
      });
    });
    
    // Add report data
    reportTrends.forEach(item => {
      const date = new Date(item.date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      });
      const existing = dateMap.get(item.date);
      if (existing) {
        existing.reports = item.value;
      } else {
        dateMap.set(item.date, {
          date,
          searches: 0,
          reports: item.value
        });
      }
    });
    
    return Array.from(dateMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [searchTrends, reportTrends]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="text-slate-600 text-sm font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-700 text-sm">
                {entry.name}: {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`w-full ${className}`}
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e2e8f0"
            opacity={0.6}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '14px'
            }}
          />
          <Line
            type="monotone"
            dataKey="searches"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
            name="검색"
          />
          <Line
            type="monotone"
            dataKey="reports"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
            name="리포트"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default TrendChart;