import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration for user-activities API');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 인증 확인
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token'
      });
    }

    if (req.method === 'GET') {
      return await handleGetActivities(req, res, user.id);
    } else if (req.method === 'POST') {
      return await handleCreateActivity(req, res, user.id);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('User activities API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

async function handleGetActivities(req, res, userId) {
  try {
    const { 
      page = 1, 
      limit = 20, 
      activity_type,
      start_date,
      end_date 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (activity_type) {
      query = query.eq('activity_type', activity_type);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: activities, error: activitiesError } = await query;

    if (activitiesError) {
      console.error('Activities query error:', activitiesError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch activities'
      });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('user_activities')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (activity_type) {
      countQuery = countQuery.eq('activity_type', activity_type);
    }

    if (start_date) {
      countQuery = countQuery.gte('created_at', start_date);
    }

    if (end_date) {
      countQuery = countQuery.lte('created_at', end_date);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Activities count error:', countError);
      return res.status(500).json({
        success: false,
        error: 'Failed to count activities'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        activities: activities || [],
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_count: count,
          total_pages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get activities error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch activities'
    });
  }
}

async function handleCreateActivity(req, res, userId) {
  try {
    const { activity_type, activity_data, ip_address, user_agent } = req.body;

    if (!activity_type || !activity_data) {
      return res.status(400).json({
        success: false,
        error: 'activity_type and activity_data are required'
      });
    }

    const { data: activity, error: insertError } = await supabase
      .from('user_activities')
      .insert({
        user_id: userId,
        activity_type,
        activity_data,
        ip_address: ip_address || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: user_agent || req.headers['user-agent']
      })
      .select()
      .single();

    if (insertError) {
      console.error('Activity insert error:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create activity'
      });
    }

    return res.status(201).json({
      success: true,
      data: { activity }
    });

  } catch (error) {
    console.error('Create activity error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create activity'
    });
  }
}