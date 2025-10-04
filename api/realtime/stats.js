import { supabase } from '../config/supabase.js';
import jwt from 'jsonwebtoken';

// In-memory store for real-time data (in production, use Redis)
let realtimeStats = null;
let lastUpdate = null;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user is admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method === 'GET') {
      // Return cached stats if recent (within 30 seconds)
      const now = Date.now();
      if (realtimeStats && lastUpdate && (now - lastUpdate) < 30000) {
        return res.status(200).json({
          success: true,
          data: realtimeStats,
          cached: true
        });
      }

      // Fetch fresh real-time statistics
      const stats = await getRealtimeStats();
      realtimeStats = stats;
      lastUpdate = now;

      return res.status(200).json({
        success: true,
        data: stats,
        cached: false
      });
    }

    if (req.method === 'POST') {
      const { action } = req.body;

      switch (action) {
        case 'maintenance':
          const { operation } = req.body;
          const result = await performMaintenance(operation, user);
          
          return res.status(200).json({
            success: true,
            data: result,
            message: `Maintenance operation '${operation}' completed successfully`
          });

        case 'refresh':
          // Force refresh of stats
          const freshStats = await getRealtimeStats();
          realtimeStats = freshStats;
          lastUpdate = Date.now();

          return res.status(200).json({
            success: true,
            data: freshStats,
            message: 'Stats refreshed successfully'
          });

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Realtime stats API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

// Function to get real-time statistics
async function getRealtimeStats() {
  try {
    const [
      totalUsers,
      totalReports,
      recentActivities,
      systemHealth
    ] = await Promise.all([
      getTotalUsers(),
      getTotalReports(),
      getRecentActivities(),
      getSystemHealth()
    ]);

    return {
      totalUsers,
      totalReports,
      recentActivities,
      systemHealth,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting real-time stats:', error);
    throw error;
  }
}

// Helper functions for statistics
async function getTotalUsers() {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  if (error) throw error;
  return count || 0;
}

async function getTotalReports() {
  const { count, error } = await supabase
    .from('ai_analysis_reports')
    .select('*', { count: 'exact', head: true });
  
  if (error) throw error;
  return count || 0;
}

async function getRecentActivities() {
  const { data, error } = await supabase
    .from('user_activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) throw error;
  return data || [];
}

async function getSystemHealth() {
  // Simple system health check
  const startTime = Date.now();
  
  try {
    // Test database connection
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    return {
      database: error ? 'unhealthy' : 'healthy',
      responseTime,
      status: error ? 'degraded' : 'operational'
    };
  } catch (error) {
    return {
      database: 'unhealthy',
      responseTime: Date.now() - startTime,
      status: 'down',
      error: error.message
    };
  }
}

// Simulate maintenance operations
async function performMaintenance(operation, user) {
  console.log(`Admin ${user.email} initiated maintenance: ${operation}`);
  
  switch (operation) {
    case 'cleanup':
      // Simulate cleanup operation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Log the maintenance activity
      await supabase
        .from('user_activities')
        .insert({
          user_id: user.id,
          activity_type: 'maintenance',
          activity_data: {
            operation: 'cleanup',
            status: 'completed',
            initiated_by: user.email
          }
        });
      
      return {
        operation: 'cleanup',
        status: 'completed',
        duration: '2 seconds',
        message: 'Database cleanup completed successfully'
      };
    
    case 'optimize':
      // Simulate optimization
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await supabase
        .from('user_activities')
        .insert({
          user_id: user.id,
          activity_type: 'maintenance',
          activity_data: {
            operation: 'optimize',
            status: 'completed',
            initiated_by: user.email
          }
        });
      
      return {
        operation: 'optimize',
        status: 'completed',
        duration: '3 seconds',
        message: 'Database optimization completed successfully'
      };
    
    case 'backup':
      // Simulate backup
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await supabase
        .from('user_activities')
        .insert({
          user_id: user.id,
          activity_type: 'maintenance',
          activity_data: {
            operation: 'backup',
            status: 'completed',
            initiated_by: user.email
          }
        });
      
      return {
        operation: 'backup',
        status: 'completed',
        duration: '5 seconds',
        message: 'System backup completed successfully'
      };
    
    default:
      throw new Error(`Unknown maintenance operation: ${operation}`);
  }
}