import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Import and setup API routes
const setupRoutes = async () => {
  try {
    // Import route handlers
    const { default: aiAnalysis } = await import('./ai-analysis.js');
    const { default: search } = await import('./search.js');
    const { default: detail } = await import('./detail.js');
    const { default: documents } = await import('./documents.js');
    const { default: generateReport } = await import('./generate-report.js');
    const { default: testEnv } = await import('./test-env.js');
    
    // Admin routes
    const { default: adminMaintenance } = await import('./admin/maintenance.js');
    const { default: adminUserActivities } = await import('./admin/user-activities.js');
    
    // User routes
    const { default: userReports } = await import('./users/reports.js');
    const { default: userSearchHistory } = await import('./users/search-history.js');
    const { default: userStats } = await import('./users/stats.js');
    
    // Realtime routes
    const { default: realtimeStats } = await import('./realtime/stats.js');
    
    // Setup routes
    app.use('/api/ai-analysis', aiAnalysis);
    app.use('/api/search', search);
    app.use('/api/detail', detail);
    app.use('/api/documents', documents);
    app.use('/api/generate-report', generateReport);
    app.use('/api/test-env', testEnv);
    
    // Admin routes
    app.use('/api/admin/maintenance', adminMaintenance);
    app.use('/api/admin/user-activities', adminUserActivities);
    
    // User routes
    app.use('/api/users/reports', userReports);
    app.use('/api/users/search-history', userSearchHistory);
    app.use('/api/users/stats', userStats);
    
    // Realtime routes
    app.use('/api/realtime/stats', realtimeStats);
    
    console.log('✅ All API routes loaded successfully');
  } catch (error) {
    console.error('❌ Error loading API routes:', error);
  }
};

// Start server
const startServer = async () => {
  await setupRoutes();
  
  app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer().catch(console.error);

export default app;