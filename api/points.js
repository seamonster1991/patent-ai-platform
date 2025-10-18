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
    // 임시로 인증 우회 - userId를 쿼리 파라미터에서 가져옴
    let userId = req.query.userId;
    
    if (!userId) {
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

      userId = user.id;
    }

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
      case 'monthly-free':
        return await handleMonthlyFree(req, res, userId);
      default:
        return res.status(400).json({ error: 'Invalid action. Use balance, deduct, charge, transactions, or monthly-free' });
    }

  } catch (error) {
    console.error('Points API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// 포인트 잔액 조회 (새로운 calculate_point_balance 함수 사용)
async function handleBalance(req, res, userId) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed for balance' });
  }

  try {
    // 새로운 calculate_point_balance 함수 사용
    const { data: balanceResult, error: balanceError } = await supabase
      .rpc('calculate_point_balance', {
        p_user_id: userId
      });

    if (balanceError) {
      console.error('Balance calculation error:', balanceError);
      return res.status(500).json({ error: 'Failed to calculate balance' });
    }

    if (!balanceResult || balanceResult.length === 0) {
      // 결과가 없으면 기본값 반환
      return res.status(200).json({
        current_balance: 0,
        balance_in_krw: 0,
        expiring_soon: null,
        last_updated: new Date().toISOString()
      });
    }

    const balance = balanceResult[0];
    
    // 만료 예정 포인트 정보 구성
    let expiringSoon = null;
    if (balance.expiring_soon > 0 && balance.expiring_date) {
      const daysLeft = Math.ceil((new Date(balance.expiring_date) - new Date()) / (1000 * 60 * 60 * 24));
      expiringSoon = {
        amount: balance.expiring_soon,
        expires_at: balance.expiring_date,
        days_left: Math.max(0, daysLeft)
      };
    }

    const responseData = {
      current_balance: balance.current_balance,
      balance_in_krw: balance.current_balance,
      expiring_soon: expiringSoon,
      last_updated: new Date().toISOString()
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
    const { amount, description, source, expires_in_days = 30, orderId, paymentType = 'addon' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // 만료일 계산
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_in_days);

    // 결제 타입에 따른 처리
    let paymentId;
    let amountKrw = 0;
    let chargeType = 'bonus';

    if (orderId && paymentType === 'addon') {
      // 실제 결제를 통한 포인트 충전
      paymentId = orderId;
      amountKrw = amount; // 실제 결제 금액
      chargeType = 'charge_addon';
    } else {
      // 무료 포인트 지급
      paymentId = `${source || 'bonus'}_${Date.now()}_${userId.substring(0, 8)}`;
      amountKrw = 0;
      chargeType = 'bonus';
    }

    // 포인트 충전 실행
    const { data: chargeResult, error: chargeError } = await supabase
      .rpc('charge_points', {
        p_user_id: userId,
        p_amount_krw: amountKrw,
        p_payment_type: chargeType,
        p_payment_id: paymentId,
        p_description: description || (orderId ? `결제 완료 - ${orderId}` : '포인트 지급'),
        p_expires_at: expiresAt.toISOString()
      });

    if (chargeError) {
      console.error('Point charge error:', chargeError);
      return res.status(500).json({ 
        success: false,
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
      description: description || (orderId ? `결제 완료 - ${orderId}` : '포인트 지급'),
      expires_at: expiresAt.toISOString(),
      new_balance: result.new_balance,
      charged_at: new Date().toISOString(),
      payment_type: chargeType,
      order_id: orderId
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Charge API error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to charge points' 
    });
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

// 월간 무료 포인트 지급 처리
async function handleMonthlyFree(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed for monthly-free' });
  }

  try {
    // 월간 무료 포인트 지급 (예: 100포인트, 30일 만료)
    const freePoints = 100;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30); // 30일 후 만료

    const { data: chargeResult, error: chargeError } = await supabase
      .rpc('charge_points', {
        p_user_id: userId,
        p_amount: freePoints,
        p_charge_type: 'monthly_free',
        p_payment_id: null,
        p_description: '월간 무료 포인트 지급',
        p_expiration_date: expirationDate.toISOString()
      });

    if (chargeError) {
      console.error('Monthly free points charge error:', chargeError);
      return res.status(500).json({ 
        error: 'Failed to charge monthly free points',
        details: chargeError.message 
      });
    }

    return res.status(200).json({
      success: true,
      message: '월간 무료 포인트가 지급되었습니다',
      points_added: freePoints,
      expiration_date: expirationDate.toISOString(),
      transaction_id: chargeResult
    });

  } catch (error) {
    console.error('Monthly free points API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process monthly free points',
      details: error.message 
    });
  }
}