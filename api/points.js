// Patent-AI 통합 포인트 관리 API
// 경로: /api/points
// 설명: 포인트 잔액 조회, 차감, 거래 내역 조회를 통합 처리

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// 환경 변수 검증
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 포인트 차감 기준
const POINT_COSTS = {
  market_analysis: 400,
  business_insight: 600
};

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 환경 변수 검증
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables');
    return res.status(500).json({ 
      error: 'Server configuration error',
      details: 'Missing required environment variables'
    });
  }

  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token or user not found' });
    }

    const userId = user.id;
    const { action } = req.query;

    // 액션에 따른 처리 분기
    switch (action) {
      case 'balance':
        return await handleBalance(req, res, userId);
      case 'deduct':
        return await handleDeduct(req, res, userId);
      case 'charge':
        return await handleCharge(req, res, userId);
      case 'transactions':
        return await handleTransactions(req, res, userId);
      default:
        return res.status(400).json({ error: 'Invalid action. Use balance, deduct, charge, or transactions' });
    }

  } catch (error) {
    console.error('Points API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// 포인트 잔액 조회
async function handleBalance(req, res, userId) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed for balance' });
  }

  try {
    // 현재 포인트 잔액 조회
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_point_balances')
      .select('current_balance, last_updated')
      .eq('user_id', userId)
      .single();

    let currentBalance = 0;
    if (balanceError && balanceError.code !== 'PGRST116') {
      console.error('Balance query error:', balanceError);
      return res.status(500).json({ error: 'Failed to fetch balance' });
    }

    if (balanceData) {
      currentBalance = balanceData.current_balance;
    } else {
      // 사용자 잔액 레코드가 없으면 생성
      const { error: insertError } = await supabase
        .from('user_point_balances')
        .upsert({ 
          user_id: userId, 
          current_balance: 0,
          last_updated: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('Failed to create user balance record:', insertError);
      }
      currentBalance = 0;
    }

    // 만료 예정 포인트 조회 (7일 이내) - 직접 쿼리로 대체
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const { data: expiringData, error: expiringError } = await supabase
      .from('point_transactions')
      .select('amount, expires_at')
      .eq('user_id', userId)
      .in('type', ['charge_monthly', 'charge_addon', 'bonus'])
      .gt('amount', 0)
      .lte('expires_at', sevenDaysFromNow.toISOString())
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true });

    if (expiringError) {
      console.error('Expiring points query error:', expiringError);
      // 오류가 발생해도 계속 진행하도록 수정
      console.warn('Continuing without expiring points data');
    }

    let expiringSoon = null;
    if (expiringData && expiringData.length > 0) {
      const totalExpiring = expiringData.reduce((sum, item) => sum + item.amount, 0);
      if (totalExpiring > 0) {
        const earliestExpiry = expiringData[0];
        const daysLeft = Math.ceil((new Date(earliestExpiry.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
        expiringSoon = {
          amount: totalExpiring,
          expires_at: earliestExpiry.expires_at,
          days_left: daysLeft
        };
      }
    }

    const responseData = {
      current_balance: currentBalance,
      balance_in_krw: currentBalance,
      expiring_soon: expiringSoon,
      last_updated: balanceData?.last_updated || new Date().toISOString()
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Balance API error:', error);
    return res.status(500).json({ error: 'Failed to fetch balance' });
  }
}

// 포인트 차감
async function handleDeduct(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed for deduct' });
  }

  try {
    const { report_type, amount, request_id } = req.body;

    if (!report_type || !['market_analysis', 'business_insight'].includes(report_type)) {
      return res.status(400).json({ 
        error: 'Invalid report_type. Must be market_analysis or business_insight' 
      });
    }

    const deductAmount = amount || POINT_COSTS[report_type];
    if (!deductAmount || deductAmount <= 0) {
      return res.status(400).json({ error: 'Invalid deduction amount' });
    }

    const uniqueRequestId = request_id || uuidv4();

    const { data: deductResult, error: deductError } = await supabase
      .rpc('deduct_points_fefo', {
        p_user_id: userId,
        p_amount: deductAmount,
        p_report_type: report_type,
        p_request_id: uniqueRequestId
      });

    if (deductError) {
      console.error('FEFO deduction error:', deductError);
      return res.status(500).json({ 
        error: 'Failed to deduct points',
        details: deductError.message 
      });
    }

    const result = deductResult[0];

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error_message || 'Deduction failed',
        current_balance: result.remaining_balance,
        required_amount: deductAmount
      });
    }

    const responseData = {
      success: true,
      points_deducted: deductAmount,
      remaining_balance: result.remaining_balance,
      transactions_created: result.transactions_created,
      report_type: report_type,
      request_id: uniqueRequestId,
      deducted_at: new Date().toISOString()
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Deduct API error:', error);
    return res.status(500).json({ error: 'Failed to deduct points' });
  }
}

// 포인트 충전
async function handleCharge(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed for charge' });
  }

  try {
    const { amount, description, source, expires_in_days = 30 } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // 만료일 계산
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_in_days);

    // 포인트 충전 실행
    const { data: chargeResult, error: chargeError } = await supabase
      .rpc('charge_points', {
        p_user_id: userId,
        p_amount_krw: 0, // 무료 포인트이므로 0원
        p_payment_type: 'bonus',
        p_payment_id: `${source}_${Date.now()}_${userId.substring(0, 8)}`,
        p_description: description || '포인트 지급',
        p_expires_at: expiresAt.toISOString()
      });

    if (chargeError) {
      console.error('Point charge error:', chargeError);
      return res.status(500).json({ 
        error: 'Failed to charge points',
        details: chargeError.message 
      });
    }

    const result = chargeResult[0];

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error_message || 'Charge failed'
      });
    }

    // 충전 성공 응답
    const responseData = {
      success: true,
      points_charged: amount,
      description: description || '포인트 지급',
      expires_at: expiresAt.toISOString(),
      new_balance: result.new_balance,
      charged_at: new Date().toISOString()
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Charge API error:', error);
    return res.status(500).json({ error: 'Failed to charge points' });
  }
}

// 거래 내역 조회
async function handleTransactions(req, res, userId) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed for transactions' });
  }

  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      start_date, 
      end_date 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('point_transactions')
      .select(`
        id,
        type,
        amount,
        source_amount_krw,
        expires_at,
        created_at,
        report_type,
        request_id
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (type && ['charge', 'deduct', 'bonus', 'expire'].includes(type)) {
      query = query.eq('type', type);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: transactions, error: transactionError } = await query;

    if (transactionError) {
      console.error('Transaction query error:', transactionError);
      return res.status(500).json({ 
        error: 'Failed to fetch transactions',
        details: transactionError.message 
      });
    }

    let countQuery = supabase
      .from('point_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (type && ['charge', 'deduct', 'bonus', 'expire'].includes(type)) {
      countQuery = countQuery.eq('type', type);
    }

    if (start_date) {
      countQuery = countQuery.gte('created_at', start_date);
    }

    if (end_date) {
      countQuery = countQuery.lte('created_at', end_date);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Transaction count error:', countError);
      return res.status(500).json({ 
        error: 'Failed to count transactions',
        details: countError.message 
      });
    }

    const formattedTransactions = transactions.map(transaction => {
      const formatted = {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        created_at: transaction.created_at,
        description: transaction.description || getDefaultDescription(transaction)
      };

      if (transaction.type === 'charge' || transaction.type === 'bonus') {
        formatted.source_amount_krw = transaction.source_amount_krw;
        formatted.expires_at = transaction.expires_at;
      }

      if (transaction.type === 'deduct') {
        formatted.report_type = transaction.report_type;
        formatted.request_id = transaction.request_id;
      }

      return formatted;
    });

    const responseData = {
      transactions: formattedTransactions,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_count: count,
        total_pages: Math.ceil(count / parseInt(limit))
      },
      filters: {
        type: type || 'all',
        start_date: start_date || null,
        end_date: end_date || null
      }
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Transactions API error:', error);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

function getDefaultDescription(transaction) {
  switch (transaction.type) {
    case 'charge':
      if (transaction.source_amount_krw > 0) {
        return `포인트 충전 (${transaction.source_amount_krw.toLocaleString()}원)`;
      }
      return '포인트 충전';
    
    case 'deduct':
      if (transaction.report_type === 'market_analysis') {
        return '시장 분석 리포트 생성';
      } else if (transaction.report_type === 'business_insight') {
        return '비즈니스 인사이트 리포트 생성';
      }
      return '포인트 차감';
    
    case 'bonus':
      return '보너스 포인트 지급';
    
    case 'expire':
      return '포인트 만료';
    
    default:
      return '포인트 거래';
  }
}