const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/search', require('./api/search.js'));
app.use('/api/detail', require('./api/detail.js'));
app.use('/api/ai-analysis', require('./api/ai-analysis.js'));
app.use('/api/generate-report', require('./api/generate-report.js'));
app.use('/api/documents', require('./api/documents.js'));

// User API routes with proper parameter handling
const userStatsRouter = express.Router();
const userSearchHistoryRouter = express.Router();
const userReportsRouter = express.Router();

// Stats route with userId parameter
userStatsRouter.get('/:userId', require('./api/users/stats.js'));
userStatsRouter.get('/', require('./api/users/stats.js')); // fallback for query params

// Search history route with userId parameter  
userSearchHistoryRouter.get('/:userId', require('./api/users/search-history.js'));
userSearchHistoryRouter.get('/', require('./api/users/search-history.js'));

// Reports route with userId parameter
userReportsRouter.get('/:userId', require('./api/users/reports.js'));
userReportsRouter.get('/', require('./api/users/reports.js'));

app.use('/api/users/stats', userStatsRouter);
app.use('/api/users/search-history', userSearchHistoryRouter);
app.use('/api/users/reports', userReportsRouter);
app.use('/api/admin/user-activities', require('./api/admin/user-activities.js'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Not found',
    path: req.originalUrl 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   POST /api/search`);
  console.log(`   POST /api/detail`);
  console.log(`   POST /api/ai-analysis`);
  console.log(`   POST /api/generate-report`);
  console.log(`   POST /api/documents`);
  console.log(`   GET  /api/users/stats/:userId`);
  console.log(`   GET  /api/users/search-history/:userId`);
  console.log(`   GET  /api/users/reports/:userId`);
  console.log(`   GET  /api/admin/user-activities`);
});

module.exports = app;