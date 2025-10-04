import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { supabase } from '../config/supabase.js';

const app = express();
const server = createServer(app);

// Configure CORS for Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://patent-ai.vercel.app', 'https://your-domain.com']
      : ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Store connected admin clients
const adminClients = new Map();

// Authentication middleware for socket connections
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify JWT token
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is admin
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', decoded.userId)
      .single();

    if (error || !user || user.role !== 'admin') {
      return next(new Error('Authentication error: Admin access required'));
    }

    socket.userId = user.id;
    socket.userEmail = user.email;
    socket.isAdmin = true;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
});

// Handle socket connections
io.on('connection', (socket) => {
  console.log(`Admin connected: ${socket.userEmail} (${socket.id})`);
  
  // Store admin client
  adminClients.set(socket.id, {
    userId: socket.userId,
    email: socket.userEmail,
    connectedAt: new Date()
  });

  // Join admin room
  socket.join('admin-room');

  // Send initial connection confirmation
  socket.emit('connected', {
    message: 'Connected to admin dashboard',
    timestamp: new Date().toISOString()
  });

  // Handle real-time stats request
  socket.on('request-stats', async () => {
    try {
      const stats = await getRealtimeStats();
      socket.emit('stats-update', stats);
    } catch (error) {
      console.error('Error fetching real-time stats:', error);
      socket.emit('error', { message: 'Failed to fetch stats' });
    }
  });

  // Handle maintenance operations
  socket.on('run-maintenance', async (operation) => {
    try {
      console.log(`Admin ${socket.userEmail} requested maintenance: ${operation}`);
      
      // Emit maintenance start notification
      io.to('admin-room').emit('maintenance-status', {
        operation,
        status: 'started',
        timestamp: new Date().toISOString(),
        initiatedBy: socket.userEmail
      });

      // Simulate maintenance operation (replace with actual implementation)
      await performMaintenance(operation);

      // Emit maintenance completion
      io.to('admin-room').emit('maintenance-status', {
        operation,
        status: 'completed',
        timestamp: new Date().toISOString(),
        initiatedBy: socket.userEmail
      });

    } catch (error) {
      console.error('Maintenance operation failed:', error);
      io.to('admin-room').emit('maintenance-status', {
        operation,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString(),
        initiatedBy: socket.userEmail
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`Admin disconnected: ${socket.userEmail} (${reason})`);
    adminClients.delete(socket.id);
    
    // Notify other admins
    socket.to('admin-room').emit('admin-disconnected', {
      email: socket.userEmail,
      reason,
      timestamp: new Date().toISOString()
    });
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

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
async function performMaintenance(operation) {
  switch (operation) {
    case 'cleanup':
      // Simulate cleanup operation
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Cleanup operation completed');
      break;
    
    case 'optimize':
      // Simulate optimization
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('Optimization completed');
      break;
    
    case 'backup':
      // Simulate backup
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('Backup completed');
      break;
    
    default:
      throw new Error(`Unknown maintenance operation: ${operation}`);
  }
}

// Broadcast real-time updates to all connected admins
export function broadcastToAdmins(event, data) {
  io.to('admin-room').emit(event, {
    ...data,
    timestamp: new Date().toISOString()
  });
}

// Broadcast system alerts
export function broadcastAlert(alert) {
  io.to('admin-room').emit('system-alert', {
    ...alert,
    timestamp: new Date().toISOString(),
    id: Date.now().toString()
  });
}

// Start periodic stats broadcasting
setInterval(async () => {
  if (adminClients.size > 0) {
    try {
      const stats = await getRealtimeStats();
      io.to('admin-room').emit('stats-update', stats);
    } catch (error) {
      console.error('Error broadcasting periodic stats:', error);
    }
  }
}, 30000); // Broadcast every 30 seconds

// Export server for use in other modules
export { io, server, app };

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.SOCKET_PORT || 3001;
  server.listen(PORT, () => {
    console.log(`Socket.IO server running on port ${PORT}`);
  });
}