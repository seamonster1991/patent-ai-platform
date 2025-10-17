/**
 * 포인트 관리 API
 * 관리자가 사용자 포인트를 수동으로 충전/삭제하는 기능
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL 또는 Service Role Key가 설정되지 않았습니다.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다.' });
  }

  try {
    const { userId, amount, type, reason, adminId } = req.body;

    // 입력값 검증
    if (!userId || !amount || !type || !reason || !adminId) {
      return res.status(400).json({ error: '필수 파라미터가 누락되었습니다.' });
    }

    if (type !== 'add' && type !== 'subtract') {
      return res.status(400).json({ error: '유효하지 않은 타입입니다. (add 또는 subtract)' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: '포인트는 0보다 커야 합니다.' });
    }

    // 현재 사용자 포인트 조회
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('point_balance')
      .eq('id', userId)
      .single();

    if (userError || !currentUser) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const currentBalance = currentUser.point_balance || 0;
    let newBalance;

    if (type === 'add') {
      newBalance = currentBalance + amount;
    } else {
      newBalance = Math.max(0, currentBalance - amount); // 음수 방지
    }

    // 트랜잭션으로 포인트 업데이트 및 히스토리 기록
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ point_balance: newBalance })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 포인트 히스토리 기록
    const { error: historyError } = await supabase
      .from('point_history')
      .insert({
        user_id: userId,
        amount: type === 'add' ? amount : -amount,
        type: type === 'add' ? 'admin_add' : 'admin_subtract',
        description: reason,
        admin_id: adminId,
        balance_before: currentBalance,
        balance_after: newBalance,
        created_at: new Date().toISOString()
      });

    if (historyError) {
      console.error('포인트 히스토리 기록 실패:', historyError);
      // 히스토리 기록 실패는 치명적이지 않으므로 계속 진행
    }

    res.status(200).json({
      success: true,
      message: `포인트가 성공적으로 ${type === 'add' ? '충전' : '차감'}되었습니다.`,
      data: {
        userId,
        previousBalance: currentBalance,
        newBalance,
        amount,
        type,
        reason
      }
    });

  } catch (error) {
    console.error('포인트 관리 오류:', error);
    res.status(500).json({ 
      error: '포인트 관리 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
}