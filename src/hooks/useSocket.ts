import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface SocketStats {
  totalUsers: number;
  totalReports: number;
  recentActivities: any[];
  systemHealth: {
    database: string;
    responseTime: number;
    status: string;
    error?: string;
  };
  timestamp: string;
}

interface MaintenanceStatus {
  operation: string;
  status: 'started' | 'completed' | 'failed';
  timestamp: string;
  initiatedBy: string;
  error?: string;
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
}

interface UseSocketReturn {
  socket: null;
  isConnected: boolean;
  stats: SocketStats | null;
  alerts: SystemAlert[];
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  requestStats: () => void;
  runMaintenance: (operation: string) => void;
  clearAlerts: () => void;
}

export const useSocket = (): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<SocketStats | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const { user } = useAuthStore();
  const [token, setToken] = useState<string | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const isPolling = useRef(false);

  // Get token from Supabase session
  useEffect(() => {
    const getToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setToken(session?.access_token || null);
    };
    
    if (user) {
      getToken();
    } else {
      setToken(null);
    }
  }, [user]);

  const connect = useCallback(async () => {
    if (!token || !user || user.role !== 'admin') {
      setConnectionError('Admin authentication required');
      return;
    }

    if (isPolling.current) {
      return; // Already polling
    }

    console.log('Starting real-time polling...');
    isPolling.current = true;
    setIsConnected(true);
    setConnectionError(null);
    toast.success('Real-time connection established');

    // Start polling for stats
    const poll = async () => {
      try {
        const response = await fetch('/api/realtime/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setStats(result.data);
            setConnectionError(null);
          }
        } else if (response.status === 401 || response.status === 403) {
          setConnectionError('Authentication failed');
          setIsConnected(false);
          isPolling.current = false;
        }
      } catch (error) {
        console.error('Polling error:', error);
        setConnectionError('Connection error');
      }
    };

    // Initial poll
    await poll();

    // Set up polling interval (every 30 seconds)
    pollingInterval.current = setInterval(poll, 30000);
  }, [token, user]);

  const disconnect = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    isPolling.current = false;
    setIsConnected(false);
    setConnectionError(null);
    setStats(null);
    setAlerts([]);
    toast.info('Real-time connection closed');
  }, []);

  const requestStats = useCallback(async () => {
    if (!isConnected || !token) {
      toast.error('Not connected to real-time server');
      return;
    }

    try {
      const response = await fetch('/api/realtime/stats?force=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setStats(result.data);
          toast.success('Statistics updated');
        }
      } else {
        toast.error('Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Request stats error:', error);
      toast.error('Failed to fetch statistics');
    }
  }, [isConnected, token]);

  const runMaintenance = useCallback(async (operation: string) => {
    if (!isConnected || !token) {
      toast.error('Not connected to real-time server');
      return;
    }

    try {
      const response = await fetch('/api/realtime/stats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ operation })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success(`${operation} operation completed`);
          
          // Add alert for maintenance completion
          const alert: SystemAlert = {
            id: Date.now().toString(),
            type: 'success',
            title: 'Maintenance Completed',
            message: `${operation} operation completed successfully`,
            timestamp: new Date().toISOString()
          };
          setAlerts(prev => [alert, ...prev.slice(0, 9)]);
        }
      } else {
        toast.error(`Failed to run ${operation} operation`);
      }
    } catch (error) {
      console.error('Maintenance error:', error);
      toast.error(`Failed to run ${operation} operation`);
    }
  }, [isConnected, token]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Auto-connect when user is admin
  useEffect(() => {
    if (user && user.role === 'admin' && token) {
      connect();
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      isPolling.current = false;
    };
  }, [user, token, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      isPolling.current = false;
    };
  }, []);

  return {
    socket: null,
    isConnected,
    stats,
    alerts,
    connectionError,
    connect,
    disconnect,
    requestStats,
    runMaintenance,
    clearAlerts
  };
};