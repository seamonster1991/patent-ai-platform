require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());

// Import API handlers (only CommonJS modules)
const dashboardStatsHandler = require('./api/dashboard-stats.js');
const healthHandler = require('./api/health.js');
const searchHandler = require('./api/search.js');
const aiAnalysisHandler = require('./api/ai-analysis.js');
const generateReportHandler = require('./api/generate-report.js');
const detailHandler = require('./api/detail.js');

// API Routes
app.use('/api/dashboard-stats', dashboardStatsHandler);
app.use('/api/health', healthHandler);

// Search API route - wrap the handler function for Express
app.all('/api/search', async (req, res) => {
  try {
    await searchHandler(req, res);
  } catch (error) {
    console.error('❌ [Local Server] Search API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
});

// AI Analysis API route
app.all('/api/ai-analysis', async (req, res) => {
  try {
    await aiAnalysisHandler(req, res);
  } catch (error) {
    console.error('❌ [Local Server] AI Analysis API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
});

// Generate Report API route
app.all('/api/generate-report', async (req, res) => {
  try {
    await generateReportHandler(req, res);
  } catch (error) {
    console.error('❌ [Local Server] Generate Report API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
});

// Detail API route
app.all('/api/detail', async (req, res) => {
  try {
    await detailHandler(req, res);
  } catch (error) {
    console.error('❌ [Local Server] Detail API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
});

// Users API route (ES6 module - dynamic import)
app.all('/api/users/*', async (req, res) => {
  try {
    const { default: usersHandler } = await import('./api/users.js');
    await usersHandler(req, res);
  } catch (error) {
    console.error('❌ [Local Server] Users API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
});

// Users API route (for exact /api/users path)
app.all('/api/users', async (req, res) => {
  try {
    const { default: usersHandler } = await import('./api/users.js');
    await usersHandler(req, res);
  } catch (error) {
    console.error('❌ [Local Server] Users API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Patent AI Local Server is running',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Local server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard Stats API: http://localhost:${PORT}/api/dashboard-stats`);
  console.log(`🔍 Search API: http://localhost:${PORT}/api/search`);
  console.log(`🤖 AI Analysis API: http://localhost:${PORT}/api/ai-analysis`);
  console.log(`📄 Generate Report API: http://localhost:${PORT}/api/generate-report`);
  console.log(`📋 Detail API: http://localhost:${PORT}/api/detail`);
  console.log(`👤 Users API: http://localhost:${PORT}/api/users`);
  console.log(`💚 Health Check API: http://localhost:${PORT}/api/health`);
});