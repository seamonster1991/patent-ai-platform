/// <reference types="../deno.d.ts" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🧹 Starting user activities cleanup process...')
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get current timestamp for logging
    const startTime = new Date().toISOString()
    console.log(`Cleanup started at: ${startTime}`)

    // Call the cleanup function (100일 이상 된 데이터 삭제)
    const { data, error } = await supabaseClient.rpc('delete_old_user_activities')

    if (error) {
      console.error('❌ Error cleaning up user activities:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          timestamp: startTime
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const endTime = new Date().toISOString()
    const deletedCount = data || 0
    
    console.log(`✅ Successfully cleaned up ${deletedCount} old user activities`)
    console.log(`Cleanup completed at: ${endTime}`)

    // 추가 통계 정보 조회
    const { data: remainingCount, error: countError } = await supabaseClient
      .from('user_activities')
      .select('id', { count: 'exact', head: true })

    let totalRemaining = 0
    if (!countError && remainingCount) {
      totalRemaining = remainingCount.length || 0
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Old user activities cleaned up successfully (100+ days old)',
        deletedCount: deletedCount,
        remainingActivities: totalRemaining,
        cleanupPeriod: '100 days',
        startTime: startTime,
        endTime: endTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error during cleanup:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})