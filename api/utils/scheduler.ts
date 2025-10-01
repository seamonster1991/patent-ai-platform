import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Clean up user activities older than 100 days
 */
async function cleanupOldUserActivities() {
  try {
    console.log('🧹 Starting cleanup of old user activities...');
    
    const { data, error } = await supabase.rpc('delete_old_user_activities');
    
    if (error) {
      console.error('❌ Error cleaning up user activities:', error);
      return;
    }
    
    console.log(`✅ Successfully cleaned up ${data || 0} old user activities`);
  } catch (error) {
    console.error('❌ Unexpected error during cleanup:', error);
  }
}

/**
 * Initialize all scheduled tasks
 */
export function initializeScheduler() {
  console.log('📅 Initializing scheduler...');
  
  // Run cleanup daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ Running scheduled cleanup of old user activities...');
    await cleanupOldUserActivities();
  }, {
    timezone: "Asia/Seoul"
  });
  
  // Run cleanup immediately on startup (for testing)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development mode: Running initial cleanup...');
    setTimeout(cleanupOldUserActivities, 5000); // Wait 5 seconds after startup
  }
  
  console.log('✅ Scheduler initialized successfully');
}

/**
 * Manual cleanup function for testing
 */
export async function manualCleanup() {
  await cleanupOldUserActivities();
}