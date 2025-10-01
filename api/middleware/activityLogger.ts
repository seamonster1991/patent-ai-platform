import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

// Activity types enum
export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  SEARCH = 'search',
  VIEW_PATENT = 'view_patent',
  PROFILE_UPDATE = 'profile_update',
  DASHBOARD_ACCESS = 'dashboard_access',
  REPORT_GENERATE = 'report_generate',
  API_CALL = 'api_call'
}

// Interface for activity data
interface ActivityData {
  [key: string]: any;
}

// Function to log user activity
export async function logUserActivity(
  userId: string,
  activityType: ActivityType,
  activityData: ActivityData = {},
  req?: Request
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_activities')
      .insert({
        user_id: userId,
        activity_type: activityType,
        activity_data: activityData,
        ip_address: req?.ip || req?.connection?.remoteAddress || null,
        user_agent: req?.get('User-Agent') || null
      });

    if (error) {
      console.error('Error logging user activity:', error);
    }
  } catch (err) {
    console.error('Failed to log user activity:', err);
  }
}

// Middleware to automatically log API calls
export function activityLoggerMiddleware(activityType: ActivityType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract user ID from request (assuming it's set by auth middleware)
      const userId = (req as any).user?.id || 'anonymous';
      
      // Prepare activity data based on request
      const activityData: ActivityData = {
        method: req.method,
        path: req.path,
        query: req.query,
        timestamp: new Date().toISOString()
      };

      // Add specific data based on activity type
      switch (activityType) {
        case ActivityType.SEARCH:
          activityData.searchParams = {
            keyword: req.body?.keyword || req.query?.keyword,
            searchType: req.body?.searchType || req.query?.searchType,
            inventionTitle: req.body?.inventionTitle,
            applicationNumber: req.body?.applicationNumber
          };
          break;
        case ActivityType.VIEW_PATENT:
          activityData.patentInfo = {
            patentId: req.params?.id || req.params?.applicationNumber,
            patentSource: req.path.includes('kipris') ? 'kipris' : 'internal',
            viewType: 'detail'
          };
          break;
        case ActivityType.DASHBOARD_ACCESS:
          activityData.dashboardType = req.path.includes('admin') ? 'admin' : 'user';
          break;
      }

      // Log the activity
      await logUserActivity(userId, activityType, activityData, req);
    } catch (error) {
      console.error('Error in activity logger middleware:', error);
    }
    
    next();
  };
}

// Pre-configured middleware exports
export const logDashboardAccess = activityLoggerMiddleware(ActivityType.DASHBOARD_ACCESS);

// Search activity middleware
export const logSearchActivity = activityLoggerMiddleware(ActivityType.SEARCH);

// Patent view middleware
export const logPatentView = activityLoggerMiddleware(ActivityType.VIEW_PATENT);

// API call middleware
export const logApiCall = activityLoggerMiddleware(ActivityType.API_CALL);

// Function to log login activity
export async function logLoginActivity(userId: string, req: Request): Promise<void> {
  await logUserActivity(userId, ActivityType.LOGIN, {
    loginTime: new Date().toISOString()
  }, req);
}

// Function to log logout activity
export async function logLogoutActivity(userId: string, req: Request): Promise<void> {
  await logUserActivity(userId, ActivityType.LOGOUT, {
    logoutTime: new Date().toISOString()
  }, req);
}

// Function to log profile update activity
export async function logProfileUpdateActivity(
  userId: string, 
  updatedFields: string[], 
  req: Request
): Promise<void> {
  await logUserActivity(userId, ActivityType.PROFILE_UPDATE, {
    updatedFields,
    updateTime: new Date().toISOString()
  }, req);
}

// Middleware to log report generation activity
export function logReportGenerationActivity(req: Request, res: Response, next: NextFunction) {
  // Store the original json method
  const originalJson = res.json;
  
  // Override the json method to capture response data
  res.json = function(body: any) {
    // Log the activity after successful response
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const userId = (req as any).user?.id || 'anonymous';
      const reportType = 'ai_analysis';
      const patentId = req.params.id || req.params.applicationNumber || 'unknown';
      
      logUserActivity(userId, ActivityType.REPORT_GENERATE, {
        reportType,
        patentId,
        analysisType: req.body?.analysisType || 'comprehensive',
        generationTime: new Date().toISOString()
      }, req).catch(err => console.error('Failed to log report generation:', err));
    }
    
    // Call the original json method
    return originalJson.call(this, body);
  };
  
  next();
}