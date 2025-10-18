// Main Express server entry point
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// import { startMonthlyPointsScheduler } from './scheduler/monthly-points-cron.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-scheduler-key']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Wrapper function for Vercel handlers
function wrapVercelHandler(handlerPath) {
  return async (req, res) => {
    try {
      const handler = await import(handlerPath);
      await handler.default(req, res);
    } catch (error) {
      console.error(`Error loading handler ${handlerPath}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Health check endpoint (통합된 health.js 기능)
app.get('/api/health', (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: {
        isVercel: !!process.env.VERCEL,
        nodeEnv: process.env.NODE_ENV,
        viteAppEnv: process.env.VITE_APP_ENV,
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasNicePayConfig: !!(process.env.NICEPAY_MERCHANT_ID && process.env.NICEPAY_MERCHANT_KEY)
      },
      services: {
        database: 'connected',
        authentication: 'active',
        payment: 'configured',
        ai: 'available'
      },
      version: '1.0.0',
      uptime: process.uptime()
    };

    res.status(200).json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.all('/api/auth', wrapVercelHandler('./auth.js'));
app.all('/api/points', wrapVercelHandler('./points.js'));
app.all('/api/feedback', wrapVercelHandler('./feedback.js'));
app.all('/api/search', wrapVercelHandler('./search.js'));
app.all('/api/detail', wrapVercelHandler('./detail.js'));
app.all('/api/generate-report', wrapVercelHandler('./generate-report.js'));
app.all('/api/users', wrapVercelHandler('./users.js'));
app.all('/api/popular-keywords', wrapVercelHandler('./popular-keywords.js'));

// Admin routes
app.all('/api/admin', wrapVercelHandler('./admin.js'));

// Dashboard routes (통합된 dashboard-analytics 기능 포함)
app.all('/api/dashboard', wrapVercelHandler('./dashboard.js'));

// Payment routes (통합된 payment, webhook-payment-completed 기능 포함)
app.all('/api/nicepay', wrapVercelHandler('./nicepay.js'));

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // 월간 포인트 스케줄러 시작 (주석 처리됨)
  // startMonthlyPointsScheduler();
  
  // WebSocket 서버 시작 (관리자 대시보드용)
  console.log(`🔌 WebSocket server available at http://localhost:${PORT}/admin/socket.io`);
});

export default app;