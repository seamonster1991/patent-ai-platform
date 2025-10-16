import React from 'react';
import { motion } from 'framer-motion';
import StatsCard from './StatsCard';

interface MetricData {
  id: string;
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon: React.ReactNode;
  status?: 'good' | 'warning' | 'critical';
  description?: string;
}

interface MetricsGridProps {
  metrics: MetricData[];
  loading?: boolean;
  className?: string;
  columns?: 2 | 3 | 4;
}

const MetricsGrid: React.FC<MetricsGridProps> = ({
  metrics,
  loading = false,
  className = '',
  columns = 4
}) => {
  const getGridCols = () => {
    switch (columns) {
      case 2:
        return 'grid-cols-1 md:grid-cols-2';
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    }
  };

  if (loading) {
    return (
      <div className={`grid ${getGridCols()} gap-6 ${className}`}>
        {[...Array(columns)].map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
              <div className="w-16 h-4 bg-slate-200 rounded"></div>
            </div>
            <div className="w-20 h-8 bg-slate-200 rounded mb-2"></div>
            <div className="w-24 h-3 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${getGridCols()} gap-6 ${className}`}>
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.3, 
            delay: index * 0.1,
            ease: "easeOut"
          }}
        >
          <StatsCard
            title={metric.title}
            value={metric.value}
            change={metric.change}
            icon={metric.icon}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default MetricsGrid;