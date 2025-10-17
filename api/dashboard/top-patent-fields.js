import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get period parameter from query string
    const { period = '30d', limit = 10 } = req.query;
    
    // Convert period to days
    const periodMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    
    const days = periodMap[period] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    console.log(`Fetching patent fields data from ai_analysis_reports for last ${days} days...`);

    // Fetch reports with technology fields within the specified period
    const { data: reports, error } = await supabase
      .from('ai_analysis_reports')
      .select('technology_field, technology_fields, created_at')
      .not('technology_field', 'is', null)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch patent fields data',
        details: error.message 
      });
    }

    console.log(`Found ${reports?.length || 0} reports with technology fields`);

    // Process and count technology fields
    const fieldCounts = {};
    let totalFields = 0;

    reports?.forEach(report => {
      // Process technology_fields array (priority)
      if (report.technology_fields && Array.isArray(report.technology_fields)) {
        report.technology_fields.forEach(field => {
          if (field && field.trim()) {
            const cleanField = field.trim();
            fieldCounts[cleanField] = (fieldCounts[cleanField] || 0) + 1;
            totalFields++;
          }
        });
      }
      // Fallback to single technology_field
      else if (report.technology_field && report.technology_field.trim()) {
        const cleanField = report.technology_field.trim();
        fieldCounts[cleanField] = (fieldCounts[cleanField] || 0) + 1;
        totalFields++;
      }
    });

    console.log('Field counts:', fieldCounts);
    console.log('Total fields:', totalFields);

    // Sort by count and get top N (based on limit parameter)
    const topCount = parseInt(limit) || 10;
    const sortedFields = Object.entries(fieldCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, topCount)
      .map(([field, count], index) => ({
        rank: index + 1,
        field: field,
        count: count,
        percentage: totalFields > 0 ? ((count / totalFields) * 100).toFixed(1) : '0.0'
      }));

    // Calculate trends (mock data for now, can be enhanced with time-based analysis)
    const fieldsWithTrends = sortedFields.map(field => ({
      ...field,
      trend: Math.random() > 0.5 ? 'up' : 'down',
      trendValue: (Math.random() * 20 - 10).toFixed(1) // Random trend between -10% and +10%
    }));

    const response = {
      success: true,
      data: {
        topFields: fieldsWithTrends,
        totalReports: reports?.length || 0,
        totalFields: totalFields,
        lastUpdated: new Date().toISOString()
      }
    };

    console.log('Sending response:', JSON.stringify(response, null, 2));

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error in top-patent-fields API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}