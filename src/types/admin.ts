// 관리자 관련 타입 정의

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalReports: number;
  totalSearches: number;
  newUsersToday: number;
  searchesToday: number;
  reportsToday: number;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  overallStatus: 'healthy' | 'warning' | 'error';
  uptime: number;
  activeUsers: number;
  requestsPerMinute: number;
  database: {
    status: 'online' | 'offline' | 'slow';
    responseTime: number;
    connections: number;
  };
  server: {
    status: 'online' | 'offline' | 'overloaded';
    cpuUsage: number;
    memoryUsage: number;
    uptime: number;
  };
  storage: {
    status: 'normal' | 'warning' | 'critical';
    usedSpace: number;
    totalSpace: number;
  };
  services?: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
  }>;
  serverMetrics?: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIn: number;
    networkOut: number;
  };
  databaseMetrics?: {
    connections: number;
    queries: number;
    avgResponseTime: number;
    size: number;
    cacheHitRatio: number;
  };
  recentAlerts?: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
  performanceTrends?: {
    cpu: number[];
    memory: number[];
    responseTime: number[];
  };
}

export interface RecentActivity {
  id: string;
  type: 'user_registration' | 'report_generated' | 'search_performed' | 'system_event';
  description: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  metadata?: Record<string, any>;
}

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'super_admin';
  lastLogin?: string;
  createdAt: string;
  isActive: boolean;
}

export interface BillingEvent {
  id: string;
  event_type: string;
  subscription_tier?: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  processed_at: string;
  event_data?: Record<string, any>;
}

export interface UserManagementData {
  users: Array<{
    id: string;
    email: string;
    name?: string;
    company?: string;
    phone?: string;
    bio?: string;
    role?: string;
    subscriptionPlan?: string;
    usageCount?: number;
    createdAt: string;
    updatedAt?: string;
    lastLogin?: string;
    isActive: boolean;
    reportCount: number;
    searchCount: number;
    downloadCount?: number;
    activityCount?: number;
    totalPayments?: number;
    billingHistory?: BillingEvent[];
    currentSubscription?: string;
    metadata?: {
      loginCount: number;
      lastActivity?: string;
      joinedDaysAgo: number;
    };
  }>;
  totalUsers: number;
  activeUsers: number;
  premiumUsers?: number;
  newUsersThisMonth: number;
  totalRevenue?: number;
  stats?: {
    totalUsers: number;
    activeUsers: number;
    premiumUsers: number;
    newUsersThisMonth: number;
    totalRevenue: number;
    averageReportsPerUser: number;
    averageSearchesPerUser: number;
  };
}

export interface ReportManagementData {
  reports: Array<{
    id: string;
    title: string;
    type: string;
    userId: string;
    user_email?: string;
    user_name?: string;
    createdAt: string;
    generated_at?: string;
    applicationNumber?: string;
    qualityRating?: number;
    reportData?: any;
    created_at: string;
    status: 'completed' | 'processing' | 'failed' | 'pending';
    fileSize?: number;
    downloadCount: number;
  }>;
  totalReports: number;
  completedReports: number;
  processingReports: number;
  failedReports: number;
  reportsThisMonth: number;
  reportsLastMonth?: number;
  totalFileSize: number;
  totalDownloads?: number;
  averageQuality?: number;
  typeStats?: Record<string, number>;
  userStats?: Record<string, {
    userId: string;
    userEmail: string;
    userName: string;
    reportCount: number;
    totalDownloads: number;
    averageQuality: number;
  }>;
}

export interface SystemMetrics {
  realTime: {
    activeConnections: number;
    requestsPerMinute: number;
    errorsPerMinute: number;
    activeUsers: number;
    searchesPerMinute: number;
    reportsPerMinute: number;
  };
  daily: {
    totalRequests: number;
    totalErrors: number;
    totalUsers: number;
    totalSearches: number;
    totalReports: number;
  };
  weekly: {
    totalRequests: number;
    totalErrors: number;
    totalUsers: number;
    totalSearches: number;
    totalReports: number;
  };
}

// 대시보드 100일 데이터 타입들
export interface DailyDataPoint {
  date: string;
  count: number;
}

export interface ActivityDataPoint {
  type: string;
  count: number;
}

export interface HourlyActivityPoint {
  hour: number;
  count: number;
}

export interface ActivityAnalysis {
  byType: ActivityDataPoint[];
  byHour: HourlyActivityPoint[];
}

export interface SystemMetricPoint {
  date: string;
  type: string;
  name: string;
  value: number;
  unit: string;
}

export interface PopularKeyword {
  keyword: string;
  count: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface ReportTypeData {
  type: string;
  count: number;
}

export interface DashboardData {
  dailySignups: DailyDataPoint[];
  dailyReports: DailyDataPoint[];
  dailySearches: DailyDataPoint[];
  activityAnalysis: ActivityAnalysis;
  systemMetrics: SystemMetricPoint[];
  popularKeywords: PopularKeyword[];
  revenueData: RevenueDataPoint[];
  reportTypes: ReportTypeData[];
  totalStats: {
    totalUsers: number;
    totalReports: number;
    totalSearches: number;
    totalRevenue: number;
    averageDailyUsers: number;
    averageDailyReports: number;
    averageDailySearches: number;
    averageDailyRevenue: number;
  };
}