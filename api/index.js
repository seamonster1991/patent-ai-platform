// Main Express server entry point
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { startMonthlyPointsScheduler } from './scheduler/monthly-points-cron.js';

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
      const handlerModule = await import(handlerPath);
      const handler = handlerModule.default || handlerModule;
      await handler(req, res);
    } catch (error) {
      console.error(`Error in ${handlerPath}:`, error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  };
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes - Points
app.all('/api/points', wrapVercelHandler('./points.js'));
app.get('/api/points/balance', wrapVercelHandler('./points.js'));
app.post('/api/points/deduct', wrapVercelHandler('./points.js'));
app.post('/api/points/charge', wrapVercelHandler('./points.js'));
app.get('/api/points/transactions', wrapVercelHandler('./points.js'));
app.all('/api/points/monthly-free', wrapVercelHandler('./points/monthly-free.js'));

// Monthly Points API
app.all('/api/monthly-points', wrapVercelHandler('./monthly-points.js'));

// API Routes - User Activities
app.all('/api/user_activities', wrapVercelHandler('./user-activities.js'));

// API Routes - NicePay
app.all('/api/nicepay', wrapVercelHandler('./nicepay.js'));

// API Routes - Other
app.all('/api/search', wrapVercelHandler('./search.js'));
app.all('/api/detail', wrapVercelHandler('./detail.js'));
app.all('/api/generate-report', wrapVercelHandler('./generate-report.js'));
app.all('/api/billing', wrapVercelHandler('./billing.js'));
app.all('/api/users', wrapVercelHandler('./admin/users.js'));
app.all('/api/dashboard-analytics', wrapVercelHandler('./dashboard-analytics.js'));
app.all('/api/popular-keywords', wrapVercelHandler('./popular-keywords.js'));
app.all('/api/ai-analysis', wrapVercelHandler('./ai-analysis.js'));

// Admin routes
app.all('/api/admin', wrapVercelHandler('./admin.js'));
app.all('/api/admin/auth/*', wrapVercelHandler('./admin/auth.js'));
app.all('/api/admin/auth', wrapVercelHandler('./admin/auth.js'));
app.all('/api/admin/analytics', wrapVercelHandler('./admin/analytics.js'));
app.all('/api/admin/analytics-keywords', wrapVercelHandler('./admin/analytics-keywords.js'));
app.all('/api/admin/analytics-reports', wrapVercelHandler('./admin/analytics-reports.js'));
app.all('/api/admin/analytics-overview', wrapVercelHandler('./admin/analytics-overview.js'));
app.all('/api/admin/dashboard', wrapVercelHandler('./admin/dashboard.js'));
app.all('/api/admin/dashboard-statistics', wrapVercelHandler('./admin/dashboard-statistics.js'));
app.all('/api/admin/dashboard-charts', wrapVercelHandler('./admin/dashboard-charts.js'));
app.all('/api/admin/system', wrapVercelHandler('./admin/system.js'));
app.all('/api/admin/users', wrapVercelHandler('./admin/users.js'));
app.all('/api/admin/users-management', wrapVercelHandler('./admin/users-management.js'));
app.all('/api/admin/billing', wrapVercelHandler('./admin/billing-management.js'));
app.all('/api/admin/billing-management', wrapVercelHandler('./admin/billing-management.js'));
app.all('/api/admin/payment-management', wrapVercelHandler('./admin/payment-management.js'));

// Dashboard API routes
app.get('/api/dashboard/metrics', wrapVercelHandler('./dashboard/metrics.js'));
app.get('/api/dashboard/comprehensive-stats', wrapVercelHandler('./dashboard/comprehensive-stats.js'));
app.get('/api/dashboard/extended-stats', wrapVercelHandler('./dashboard/extended-stats.js'));
app.get('/api/dashboard/daily-trends', wrapVercelHandler('./dashboard/daily-trends.js'));
app.get('/api/dashboard/popular-keywords', wrapVercelHandler('./dashboard/popular-keywords.js'));
app.get('/api/dashboard/popular-patents', wrapVercelHandler('./dashboard/popular-patents.js'));
app.get('/api/dashboard/recent-activities', wrapVercelHandler('./dashboard/recent-activities.js'));
app.get('/api/dashboard/system-metrics', wrapVercelHandler('./dashboard/system-metrics.js'));
app.get('/api/dashboard/user-stats', wrapVercelHandler('./dashboard/user-stats.js'));

// Admin Dashboard API routes
app.get('/api/dashboard/admin-comprehensive-stats', wrapVercelHandler('./dashboard/admin-comprehensive-stats.js'));
app.get('/api/dashboard/admin-trends', wrapVercelHandler('./dashboard/admin-trends.js'));
app.get('/api/dashboard/admin-top-insights', wrapVercelHandler('./dashboard/admin-top-insights.js'));
app.get('/api/dashboard/top-keywords', wrapVercelHandler('./dashboard/top-keywords.js'));
app.get('/api/dashboard/top-report-categories', wrapVercelHandler('./dashboard/top-report-categories.js'));
app.get('/api/dashboard/top-patent-fields', wrapVercelHandler('./dashboard/top-patent-fields.js'));
app.all('/api/dashboard/admin-users', wrapVercelHandler('./dashboard/admin-users.js'));
app.all('/api/dashboard/admin-payments', wrapVercelHandler('./dashboard/admin-payments.js'));

// Payment Routes
app.all('/api/payment/history', wrapVercelHandler('./payment/history.js'));
app.all('/api/payment/result', wrapVercelHandler('./payment/result.js'));

// Webhook Routes
app.all('/api/webhook-payment-completed', wrapVercelHandler('./webhook-payment-completed.js'));

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  
  // Start monthly points scheduler
  try {
    startMonthlyPointsScheduler();
    console.log(`⏰ Monthly points scheduler started`);
  } catch (error) {
    console.error('Failed to start monthly points scheduler:', error);
  }
});

export default app;