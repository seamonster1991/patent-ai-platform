import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { 
  logUserActivity, 
  ActivityType, 
  logDashboardAccess,
  logProfileUpdateActivity 
} from '../middleware/activityLogger';

dotenv.config();

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface SearchHistoryItem {
  id: string;
  user_id: string;
  keyword: string;
  filters: any;
  results_count: number;
  created_at: string;
}

interface ReportItem {
  id: string;
  user_id: string;
  patent_id: string;
  title: string;
  type: string;
  content: string;
  created_at: string;
}

// Get user profile
router.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

// Update user profile
router.put('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { name, company, phone, bio } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .update({
        name,
        company,
        phone,
        bio,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Failed to update profile'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile'
    });
  }
});

// Get user search history
router.get('/search-history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const { data: searchHistory, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get search history'
      });
    }

    // Get total count
    const { count } = await supabase
      .from('search_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    res.json({
      success: true,
      data: {
        history: searchHistory,
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get search history'
    });
  }
});

// Save search to history
router.post('/search-history', async (req: Request, res: Response) => {
  try {
    const { user_id, keyword, filters, results_count } = req.body;

    const { data: searchRecord, error } = await supabase
      .from('search_history')
      .insert({
        user_id,
        keyword,
        filters: filters || {},
        results_count: results_count || 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Failed to save search history'
      });
    }

    res.json({
      success: true,
      data: searchRecord
    });
  } catch (error) {
    console.error('Save search history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save search history'
    });
  }
});

// Get user reports
router.get('/reports/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get reports'
      });
    }

    // Get total count
    const { count } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    res.json({
      success: true,
      data: {
        reports: reports,
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reports'
    });
  }
});

// Save report
router.post('/reports', async (req: Request, res: Response) => {
  try {
    const { user_id, patent_id, title, type, content } = req.body;

    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        user_id,
        patent_id,
        title,
        type,
        content,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Failed to save report'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Save report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save report'
    });
  }
});

// Get user statistics
router.get('/stats/:userId', logDashboardAccess, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Log dashboard access activity
    await logUserActivity(userId, ActivityType.DASHBOARD_ACCESS, {
      dashboardType: 'user',
      endpoint: '/stats'
    }, req);

    // Get search count from user_activities
    const { count: searchActivitiesCount } = await supabase
      .from('user_activities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('activity_type', 'search');

    // Get search count from search_history (legacy)
    const { count: searchHistoryCount } = await supabase
      .from('search_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get reports count
    const { count: reportsCount } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get report generation activities
    const { count: reportActivitiesCount } = await supabase
      .from('user_activities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('activity_type', 'report_generate');

    // Get monthly activity (all activities in current month)
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const { count: monthlyActivity } = await supabase
      .from('user_activities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', currentMonth.toISOString());

    // Get patent view activities
    const { count: patentViewsCount } = await supabase
      .from('user_activities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('activity_type', 'view_patent');

    // Get login activities for engagement metrics
    const { count: loginCount } = await supabase
      .from('user_activities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('activity_type', 'login');

    res.json({
      success: true,
      data: {
        totalSearches: (searchActivitiesCount || 0) + (searchHistoryCount || 0),
        reportsGenerated: (reportsCount || 0) + (reportActivitiesCount || 0),
        monthlyActivity: monthlyActivity || 0,
        savedPatents: patentViewsCount || 0,
        totalLogins: loginCount || 0,
        engagementScore: Math.min(100, ((monthlyActivity || 0) * 10))
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user statistics'
    });
  }
});

// Delete user account
router.delete('/account/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Delete user profile
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (profileError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete user profile'
      });
    }

    // Delete search history
    await supabase
      .from('search_history')
      .delete()
      .eq('user_id', userId);

    // Delete reports
    await supabase
      .from('reports')
      .delete()
      .eq('user_id', userId);

    res.json({
      success: true,
      message: 'User account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user account'
    });
  }
});

// Get admin dashboard statistics
router.get('/admin/stats', logDashboardAccess, async (req: Request, res: Response) => {
  try {
    // Log admin dashboard access
    const adminUserId = (req as any).user?.id || 'admin';
    await logUserActivity(adminUserId, ActivityType.DASHBOARD_ACCESS, {
      dashboardType: 'admin',
      endpoint: '/admin/stats'
    }, req);

    // Get total users count
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get active users (users who have any activity in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: activeUsersData } = await supabase
      .from('user_activities')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const activeUsers = new Set(activeUsersData?.map(item => item.user_id) || []).size;

    // Get total reports count (from both tables)
    const { count: reportsTableCount } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true });

    const { count: reportActivitiesCount } = await supabase
      .from('user_activities')
      .select('*', { count: 'exact', head: true })
      .eq('activity_type', 'report_generate');

    // Get total searches count (from both tables)
    const { count: searchHistoryCount } = await supabase
      .from('search_history')
      .select('*', { count: 'exact', head: true });

    const { count: searchActivitiesCount } = await supabase
      .from('user_activities')
      .select('*', { count: 'exact', head: true })
      .eq('activity_type', 'search');

    // Get new signups in the last 30 days
    const { count: newSignups } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get monthly activity (all activities in the last 30 days)
    const { count: monthlyActivity } = await supabase
      .from('user_activities')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get activity breakdown by type
    const { data: activityBreakdown } = await supabase
      .from('user_activities')
      .select('activity_type')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const activityStats = activityBreakdown?.reduce((acc: any, activity) => {
      acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get recent users for user list
    const { data: recentUsers } = await supabase
      .from('users')
      .select('id, email, name, subscription_plan, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get daily activity for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: dailyActivityData } = await supabase
      .from('user_activities')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    const dailyActivity = dailyActivityData?.reduce((acc: any, activity) => {
      const date = new Date(activity.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {}) || {};

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        activeUsers,
        totalReports: (reportsTableCount || 0) + (reportActivitiesCount || 0),
        totalSearches: (searchHistoryCount || 0) + (searchActivitiesCount || 0),
        newSignups: newSignups || 0,
        monthlyActivity: monthlyActivity || 0,
        recentUsers: recentUsers || [],
        activityBreakdown: activityStats,
        dailyActivity,
        engagementRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin statistics'
    });
  }
});

export default router;