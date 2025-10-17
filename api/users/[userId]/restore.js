import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Database configuration error',
      details: 'Missing environment variables'
    });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ 
      error: 'Missing user ID',
      details: 'User ID is required'
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 삭제된 사용자 확인
    const userCheck = await supabase
      .from('users')
      .select('id, email, name, deleted_at')
      .eq('id', userId)
      .single();

    if (userCheck.error || !userCheck.data) {
      return res.status(404).json({ 
        error: 'User not found',
        details: 'The specified user does not exist'
      });
    }

    if (!userCheck.data.deleted_at) {
      return res.status(400).json({ 
        error: 'User not deleted',
        details: 'This user is not deleted and cannot be restored'
      });
    }

    // 사용자 복원 실행
    const result = await supabase
      .from('users')
      .update({
        deleted_at: null,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (result.error) {
      return res.status(500).json({ 
        error: 'Failed to restore user',
        details: result.error.message 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User restored successfully',
      user_id: userId,
      data: result.data
    });
  } catch (error) {
    console.error('Restore user error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}