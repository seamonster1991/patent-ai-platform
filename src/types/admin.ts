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

export interface UserManagementData {
  users: Array<{
    id: string;
    email: string;
    name?: string;
    company?: string;
    phone?: string;
    createdAt: string;
    lastLogin?: string;
    isActive: boolean;
    reportCount: number;
    searchCount: number;
  }>;
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
}

export interface ReportManagementData {
  reports: Array<{
    id: string;
    title: string;
    type: string;
    userId: string;
    user_email?: string;
    createdAt: string;
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
  totalFileSize: number;
}

export interface SystemMetrics {
  realtime: {
    activeConnections: number;
    requestsPerMinute: number;
    errorRate: number;
    averageResponseTime: number;
  };
  daily: Array<{
    date: string;
    users: number;
    searches: number;
    reports: number;
    errors: number;
  }>;
  weekly: Array<{
    week: string;
    users: number;
    searches: number;
    reports: number;
    errors: number;
  }>;
}