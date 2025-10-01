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
      const userId = (req as any).user?.id || (req as any).userId;
      
      if (userId) {
        const activityData: ActivityData = {
          endpoint: req.path,
          method: req.method,
          query: req.query,
          timestamp: new Date().toISOString()
        };

        // Add specific data based on activity type
        switch (activityType) {
          case ActivityType.SEARCH:
            activityData.searchParams = {
              keyword: req.body.keyword || req.query.keyword,
              applicant: req.body.applicant || req.query.applicant,
              dateFrom: req.body.application_date_from || req.query.application_date_from,
              dateTo: req.body.application_date_to || req.query.application_date_to
            };
            break;
          case ActivityType.VIEW_PATENT:
            activityData.patentId = req.params.id || req.query.id;
            break;
          case ActivityType.DASHBOARD_ACCESS:
            activityData.dashboardType = req.path.includes('admin') ? 'admin' : 'user';
            break;
        }

        await logUserActivity(userId, activityType, activityData, req);
      }
    } catch (error) {
      console.error('Activity logging middleware error:', error);
    }
    
    next();
  };
}

// Middleware to log dashboard access
export const logDashboardAccess = activityLoggerMiddleware(ActivityType.DASHBOARD_ACCESS);

// Middleware to log search activities
export const logSearchActivity = activityLoggerMiddleware(ActivityType.SEARCH);

// Middleware to log patent view activities
export const logPatentView = activityLoggerMiddleware(ActivityType.VIEW_PATENT);

// Middleware to log API calls
export const logApiCall = activityLoggerMiddleware(ActivityType.API_CALL);

// Function to log login activity
export async function logLoginActivity(userId: string, req: Request): Promise<void> {
  await logUserActivity(userId, ActivityType.LOGIN, {
    loginTime: new Date().toISOString(),
    method: 'email' // or other auth methods
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

// Function to log report generation activity
export async function logReportGenerationActivity(
  userId: string, 
  reportType: string, 
  patentId: string, 
  req: Request
): Promise<void> {
  await logUserActivity(userId, ActivityType.REPORT_GENERATE, {
    reportType,
    patentId,
    generationTime: new Date().toISOString()
  }, req);
}