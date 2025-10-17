// Payment API - 결제 관련 모든 기능 통합
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { paymentSecurity } from './middleware/payment-security.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// 공통 헤더 설정
function setCommonHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// 보안 미들웨어 적용
async function applySecurityMiddleware(req, res, options = {}) {
  return new Promise((resolve, reject) => {
    const middlewares = paymentSecurity({
      requireAuth: true,
      requireAdmin: false,
      rateLimitType: 'DEFAULT',
      ...options
    });
    
    let index = 0;
    function runNext(error) {
      if (error) return reject(error);
      if (index >= middlewares.length) return resolve();
      
      const middleware = middlewares[index++];
      middleware(req, res, runNext);
    }
    
    runNext();
  });
}

// 결제 내역 조회
async function handlePaymentHistory(req, res) {
  try {
    await applySecurityMiddleware(req, res);

    const { 
      userId, 
      page = 1, 
      limit = 10, 
      status, 
      startDate, 
      endDate,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // 페이지네이션 계산
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 기본 쿼리 구성
    let query = supabase
      .from('payment_transactions')
      .select(`
        *,
        users!inner(id, email, name)
      `, { count: 'exact' });

    // 사용자 ID 필터
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // 상태 필터
    if (status) {
      query = query.eq('status', status);
    }

    // 날짜 범위 필터
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // 정렬 및 페이지네이션
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + parseInt(limit) - 1);

    const { data: payments, error, count } = await query;

    if (error) {
      console.error('Payment history query error:', error);
      return res.status(500).json({ error: 'Failed to fetch payment history' });
    }

    // 통계 정보 계산
    const { data: stats } = await supabase
      .from('payment_transactions')
      .select('status, amount.sum()')
      .eq('user_id', userId || payments[0]?.user_id);

    const totalPages = Math.ceil(count / parseInt(limit));

    return res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        },
        stats: stats || []
      }
    });

  } catch (error) {
    console.error('Payment history error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 결제 결과 조회
async function handlePaymentResult(req, res) {
  try {
    await applySecurityMiddleware(req, res);

    const { orderId, tid } = req.query;

    if (!orderId || !tid) {
      return res.status(400).json({ error: 'Missing orderId or tid parameter' });
    }

    // 결제 정보 조회
    const { data: payment, error } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        users!inner(id, email, name)
      `)
      .eq('order_id', orderId)
      .eq('tid', tid)
      .single();

    if (error || !payment) {
      console.error('Payment not found:', error);
      return res.status(404).json({ error: 'Payment not found' });
    }

    // 결제 상태에 따른 응답
    const response = {
      success: true,
      data: {
        payment: {
          orderId: payment.order_id,
          tid: payment.tid,
          amount: payment.amount,
          status: payment.status,
          paymentMethod: payment.payment_method,
          createdAt: payment.created_at,
          completedAt: payment.completed_at,
          user: {
            id: payment.users.id,
            name: payment.users.name,
            email: payment.users.email
          }
        }
      }
    };

    // 성공한 결제의 경우 포인트 정보도 포함
    if (payment.status === 'completed') {
      const { data: pointTransaction } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('payment_id', payment.id)
        .single();

      if (pointTransaction) {
        response.data.pointsAdded = pointTransaction.amount;
      }
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Payment result error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default async function handler(req, res) {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    // 라우팅 처리
    if (req.method === 'GET' && pathname.endsWith('/payment')) {
      const action = searchParams.get('action');
      
      switch (action) {
        case 'history':
          return await handlePaymentHistory(req, res);
        case 'result':
          return await handlePaymentResult(req, res);
        default:
          return await handlePaymentHistory(req, res); // 기본값은 결제 내역
      }
    }

    return res.status(404).json({
      success: false,
      error: 'API 엔드포인트를 찾을 수 없습니다.'
    });

  } catch (error) {
    console.error('Payment API error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
}