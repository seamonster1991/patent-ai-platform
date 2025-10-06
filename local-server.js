require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import API handlers
const aiAnalysisHandler = require('./api/ai-analysis.js');
const generateReportHandler = require('./api/generate-report.js');
const searchHandler = require('./api/search.js');
const detailHandler = require('./api/detail.js');
const documentsHandler = require('./api/documents.js');
const healthHandler = require('./api/health.js');

// API Routes
app.all('/api/ai-analysis', aiAnalysisHandler);
app.all('/api/generate-report', generateReportHandler);
app.all('/api/search', searchHandler);
app.all('/api/detail', detailHandler);
app.all('/api/documents', documentsHandler);
app.all('/api/health', healthHandler);

// User routes
const userReportsHandler = require('./api/users/reports.js');
const userSearchHistoryHandler = require('./api/users/search-history.js');
const userStatsHandler = require('./api/users/stats.js');
const userProfileHandler = require('./api/users/profile.js');
const adminStatisticsHandler = require('./api/admin/statistics.js');

app.all('/api/ai-analysis', aiAnalysisHandler);
app.all('/api/generate-report', generateReportHandler);
app.all('/api/search', searchHandler);
app.all('/api/detail', detailHandler);
app.all('/api/documents', documentsHandler);
app.all('/api/health', healthHandler);

// User routes
app.all('/api/users/reports', userReportsHandler);
app.all('/api/users/search-history', userSearchHistoryHandler);
app.all('/api/users/stats', userStatsHandler);
app.all('/api/users/profile', userProfileHandler);

// Admin routes
app.all('/api/admin/statistics', adminStatisticsHandler);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Local API Server Running', port: PORT });
});

app.listen(PORT, () => {
  console.log(`🚀 Local API Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api/*`);
});