import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { Card } from './Card';
import { Button } from './Button';
import { Maximize2, Download, RefreshCw } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
} from 'chart.js';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale
);

interface ChartData {
  labels: string[];
  datasets: any[];
}

interface ChartWidgetProps extends React.HTMLAttributes<HTMLDivElement> {
  type: 'line' | 'bar' | 'doughnut' | 'radar';
  data: ChartData;
  options?: any;
  title?: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  onFullscreen?: () => void;
}

const ChartWidget = React.forwardRef<HTMLDivElement, ChartWidgetProps>(
  ({ 
    className, 
    type, 
    data, 
    options = {}, 
    title, 
    subtitle, 
    height = 300,
    loading = false,
    onRefresh,
    onExport,
    onFullscreen,
    ...props 
  }, ref) => {
    const chartDefaults = useMemo(() => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
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
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          padding: 12,
        },
      },
      scales: type === 'doughnut' || type === 'radar' ? undefined : {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              size: 11,
            },
          },
        },
        y: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            font: {
              size: 11,
            },
          },
        },
      },
    }), [type]);

    const mergedOptions = useMemo(() => ({
      ...chartDefaults,
      ...options,
    }), [chartDefaults, options]);

    const renderChart = () => {
      // Validate data before rendering
      if (!data || !data.datasets || !Array.isArray(data.datasets) || data.datasets.length === 0) {
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-sm">데이터가 없습니다</div>
              <div className="text-xs text-gray-400 mt-1">차트를 표시할 데이터가 없습니다</div>
            </div>
          </div>
        );
      }

      // Ensure datasets have valid data arrays
      const validatedData = {
        ...data,
        datasets: data.datasets.map(dataset => ({
          ...dataset,
          data: Array.isArray(dataset.data) ? dataset.data : []
        }))
      };

      const chartProps = {
        data: validatedData,
        options: mergedOptions,
        height,
      };

      switch (type) {
        case 'line':
          return <Line {...chartProps} />;
        case 'bar':
          return <Bar {...chartProps} />;
        case 'doughnut':
          return <Doughnut {...chartProps} />;
        case 'radar':
          return <Radar {...chartProps} />;
        default:
          return <Line {...chartProps} />;
      }
    };

    const actions = (
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
        {onExport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
          >
            <Download className="w-4 h-4" />
          </Button>
        )}
        {onFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onFullscreen}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    );

    if (loading) {
      return (
        <Card
          className={cn("", className)}
          title={title}
          subtitle={subtitle}
          actions={actions}
          ref={ref}
          {...props}
        >
          <div 
            className="flex items-center justify-center bg-secondary-50 rounded-lg animate-pulse"
            style={{ height }}
          >
            <div className="text-secondary-400">
              <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card
        className={cn("", className)}
        title={title}
        subtitle={subtitle}
        actions={actions}
        ref={ref}
        {...props}
      >
        <div className="chart-container" style={{ height }}>
          {renderChart()}
        </div>
      </Card>
    );
  }
);

ChartWidget.displayName = "ChartWidget";

export { ChartWidget };
export type { ChartWidgetProps, ChartData };