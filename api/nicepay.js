// Enhanced NicePay 통합 API with Security Features
// 경로: /api/nicepay
// 설명: 나이스페이 주문 생성, 결제 승인, 콜백 처리를 통합한 API with signature validation

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { paymentSecurity } from './middleware/payment-security.js';
import { 
  PaymentError, 
  ERROR_TYPES, 
  ERROR_SEVERITY,
  logPaymentError,
  handlePaymentCancellation,
  createErrorResponse,
  withTimeout,
  safeAsyncOperation,
  paymentRequestController
} from './utils/payment-error-handler.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// NicePay 설정 정보 (데이터베이스에서 로드)
let NICEPAY_CONFIG = null;

// 설정 정보 로드 함수 (개선된 오류 처리)
async function loadNicePayConfig() {
  if (NICEPAY_CONFIG) return NICEPAY_CONFIG;
  
  try {
    console.log('🔧 [Config] NicePay 설정 로드 시작');
    const { data: settings, error } = await supabase
      .from('payment_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['nicepay_client_id', 'nicepay_secret_key', 'nicepay_api_url', 'nicepay_js_url']);

    if (error) {
      console.error('❌ [Config] 데이터베이스에서 설정 로드 실패:', error);
      throw error;
    }

    if (!settings || settings.length === 0) {
      console.warn('⚠️ [Config] 데이터베이스에 NicePay 설정이 없음, 기본값 사용');
      // Fallback to hardcoded values
      NICEPAY_CONFIG = {
        CLIENT_ID: 'R2_6496fd66ebc242b58ab7ef1722c9a92b',
        SECRET_KEY: '101d2ae924fa4ae398c3b76a7ba62226',
        API_URL: 'https://sandbox-api.nicepay.co.kr/v1/payments',
        JS_URL: 'https://pay.nicepay.co.kr/v1/js/'
      };
      return NICEPAY_CONFIG;
    }

    const config = {};
    settings.forEach(setting => {
      switch (setting.setting_key) {
        case 'nicepay_client_id':
          config.CLIENT_ID = setting.setting_value;
          break;
        case 'nicepay_secret_key':
          config.SECRET_KEY = setting.setting_value;
          break;
        case 'nicepay_api_url':
          config.API_URL = setting.setting_value;
          break;
        case 'nicepay_js_url':
          config.JS_URL = setting.setting_value;
          break;
      }
    });

    // 필수 설정 검증
    if (!config.CLIENT_ID || !config.SECRET_KEY || !config.API_URL) {
      console.error('❌ [Config] 필수 NicePay 설정이 누락됨');
      throw new Error('Missing required NicePay configuration');
    }

    NICEPAY_CONFIG = config;
    console.log('✅ [Config] NicePay 설정 로드 완료');
    return config;
  } catch (error) {
    console.error('💥 [Config] NicePay 설정 로드 실패:', error);
    // Fallback to hardcoded values for development
    NICEPAY_CONFIG = {
      CLIENT_ID: 'R2_6496fd66ebc242b58ab7ef1722c9a92b',
      SECRET_KEY: '101d2ae924fa4ae398c3b76a7ba62226',
      API_URL: 'https://sandbox-api.nicepay.co.kr/v1/payments',
      JS_URL: 'https://pay.nicepay.co.kr/v1/js/'
    };
    console.log('🔄 [Config] 기본 설정으로 폴백');
    return NICEPAY_CONFIG;
  }
}

// 시그니처 생성 함수
function generateSignature(data, secretKey) {
  const sortedKeys = Object.keys(data).sort();
  const signString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
  return crypto.createHmac('sha256', secretKey).update(signString).digest('hex');
}

// 시그니처 검증 함수
function verifySignature(data, signature, secretKey) {
  const expectedSignature = generateSignature(data, secretKey);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// 로깅 함수
async function logPaymentEvent(eventType, data, userId = null, paymentOrderId = null) {
  try {
    await supabase
      .from('payment_logs')
      .insert({
        event_type: eventType,
        event_data: data,
        user_id: userId,
        payment_order_id: paymentOrderId,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log payment event:', error);
  }
}

// 요청 검증 미들웨어
function validateRequest(req, requiredFields) {
  console.log('🔍 [ValidateRequest] 요청 검증 시작');
  console.log('📋 [ValidateRequest] 필수 필드:', requiredFields);
  console.log('📋 [ValidateRequest] 요청 본문:', req.body);
  
  if (!req.body) {
    console.error('❌ [ValidateRequest] 요청 본문이 없음');
    throw new Error('Request body is missing');
  }
  
  const missingFields = requiredFields.filter(field => {
    const value = req.body[field];
    const isMissing = value === undefined || value === null || value === '';
    if (isMissing) {
      console.error(`❌ [ValidateRequest] 누락된 필드: ${field}, 값: ${value}`);
    }
    return isMissing;
  });
  
  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
    console.error('❌ [ValidateRequest] 검증 실패:', errorMessage);
    throw new Error(errorMessage);
  }
  
  console.log('✅ [ValidateRequest] 모든 필수 필드 검증 통과');
}

// IP 주소 추출 함수
function getClientIP(req) {
  try {
    // 프록시를 통한 요청의 경우 실제 클라이언트 IP 확인
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    // 다른 헤더들 확인
    const realIP = req.headers['x-real-ip'];
    if (realIP) {
      return realIP;
    }
    
    // Node.js 최신 버전 호환성을 위한 안전한 IP 추출
    if (req.socket && req.socket.remoteAddress) {
      return req.socket.remoteAddress;
    }
    
    // req.connection이 존재하는 경우에만 접근
    if (req.connection && req.connection.remoteAddress) {
      return req.connection.remoteAddress;
    }
    
    // req.connection.socket이 존재하는 경우
    if (req.connection && req.connection.socket && req.connection.socket.remoteAddress) {
      return req.connection.socket.remoteAddress;
    }
    
    // 모든 방법이 실패한 경우 기본값 반환
    return '127.0.0.1';
  } catch (error) {
    console.warn('⚠️ [getClientIP] IP 주소 추출 실패:', error.message);
    return '127.0.0.1';
  }
}

// Apply security middleware based on action (간소화된 버전)
async function applySecurityMiddleware(req, res, next) {
  const { action } = req.query;
  
  // 기본적인 보안 검사만 수행
  try {
    // 개발 환경에서는 인증 체크를 건너뛰고, config 액션은 항상 허용
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const publicActions = ['config', 'callback', 'webhook'];
    
    if (isDevelopment || publicActions.includes(action)) {
      console.log('✅ [Security] 개발 환경 또는 공개 액션 - 인증 건너뛰기');
      next();
      return;
    }
    
    // 프로덕션 환경에서 인증이 필요한 액션들
    const authRequiredActions = ['create-order', 'approve'];
    
    if (authRequiredActions.includes(action)) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('❌ [Security] 인증 토큰이 없음');
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }
    }
    
    console.log('✅ [Security] 보안 검사 통과');
    next();
  } catch (error) {
    console.error('❌ [Security] 보안 미들웨어 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Security check failed',
      message: error.message
    });
  }
}

export default async function handler(req, res) {
  console.log('🔥 [NicePay API] 요청 시작:', {
    method: req.method,
    url: req.url,
    query: req.query,
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    }
  });

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    console.log('✅ [NicePay API] OPTIONS 요청 처리 완료');
    return res.status(200).end();
  }

  try {
    console.log('🔒 [NicePay API] 보안 미들웨어 적용 시작');
    // Apply security middleware first
    await new Promise((resolve, reject) => {
      applySecurityMiddleware(req, res, (error) => {
        if (error) {
          console.error('❌ [NicePay API] 보안 미들웨어 오류:', error);
          reject(error);
        } else {
          console.log('✅ [NicePay API] 보안 미들웨어 통과');
          resolve();
        }
      });
    });

    console.log('⚙️ [NicePay API] 설정 로드 시작');
    // 설정 로드
    await loadNicePayConfig();
    console.log('✅ [NicePay API] 설정 로드 완료:', {
      hasClientId: !!NICEPAY_CONFIG?.CLIENT_ID,
      hasSecretKey: !!NICEPAY_CONFIG?.SECRET_KEY,
      apiUrl: NICEPAY_CONFIG?.API_URL
    });

    // 요청 메타데이터
    const requestMeta = {
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    };

    console.log('📋 [NicePay API] 요청 메타데이터:', requestMeta);

    const { action } = req.query;
    console.log('🎯 [NicePay API] 액션:', action);

    switch (action) {
      case 'create-order':
        console.log('💳 [NicePay API] 주문 생성 처리 시작');
        return await handleCreateOrder(req, res, requestMeta);
      case 'approve':
        console.log('✅ [NicePay API] 결제 승인 처리 시작');
        return await handleApprove(req, res, requestMeta);
      case 'callback':
        console.log('🔄 [NicePay API] 콜백 처리 시작');
        return await handleCallback(req, res, requestMeta);
      case 'webhook':
        console.log('🪝 [NicePay API] 웹훅 처리 시작');
        return await handleWebhook(req, res, requestMeta);
      case 'config':
        console.log('⚙️ [NicePay API] 설정 조회 처리 시작');
        return await handleConfig(req, res);
      default:
        console.error('❌ [NicePay API] 잘못된 액션:', action);
        await logPaymentEvent('invalid_action', { action, ...requestMeta });
        return res.status(400).json({ 
          success: false,
          error: 'Invalid action parameter',
          message: `Action '${action}' is not supported`
        });
    }
  } catch (error) {
    console.error('💥 [NicePay API] 핸들러 최상위 오류:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    try {
      await logPaymentEvent('api_error', { 
        error: error.message,
        ip_address: getClientIP(req),
        user_agent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('❌ [NicePay API] 로그 기록 실패:', logError);
    }
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
}

// 주문 생성 (Enhanced with security)
async function handleCreateOrder(req, res, requestMeta) {
  console.log('💳 [CreateOrder] 주문 생성 함수 시작');
  
  if (req.method !== 'POST') {
    console.error('❌ [CreateOrder] 잘못된 HTTP 메서드:', req.method);
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      message: 'Only POST method is allowed'
    });
  }

  try {
    console.log('🔍 [CreateOrder] 요청 데이터 검증 시작');
    console.log('📋 [CreateOrder] 요청 본문:', req.body);
    
    validateRequest(req, ['userId', 'amount', 'goodsName', 'paymentType']);
    console.log('✅ [CreateOrder] 필수 필드 검증 통과');
    
    const { userId, amount, goodsName, paymentType, planId, payMethod = 'card' } = req.body;
    console.log('📊 [CreateOrder] 추출된 데이터:', {
      userId,
      amount,
      goodsName,
      paymentType,
      planId,
      payMethod
    });

    // 결제 방법별 금액 한도 검증
    const paymentLimits = {
      card: { min: 1000, max: 10000000 },
      kakaopay: { min: 1000, max: 2000000 },
      naverpay: { min: 1000, max: 2000000 },
      bank: { min: 1000, max: 5000000 }
    };

    const limits = paymentLimits[payMethod] || paymentLimits.card;
    if (amount < limits.min || amount > limits.max) {
      await logPaymentEvent('invalid_amount', { amount, userId, payMethod, limits, ...requestMeta });
      return res.status(400).json({ 
        success: false,
        error: 'Invalid amount',
        message: `Amount must be between ${limits.min.toLocaleString()} and ${limits.max.toLocaleString()} KRW for ${payMethod}`
      });
    }

    // 사용자 검증 - UUID 형식 확인
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('❌ [CreateOrder] 잘못된 사용자 ID 형식:', userId);
      await logPaymentEvent('invalid_user', { userId, ...requestMeta });
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: 'User ID must be a valid UUID format'
      });
    }

    // 주문 ID 생성 (더 안전한 방식)
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(8).toString('hex');
    const orderId = `ORDER_${timestamp}_${randomStr}`;
    
    // 시그니처 생성
    const signatureData = {
      orderId,
      userId,
      amount: amount.toString(),
      goodsName,
      paymentType,
      timestamp: timestamp.toString()
    };
    const signature = generateSignature(signatureData, NICEPAY_CONFIG.SECRET_KEY);

    // 주문 정보를 데이터베이스에 저장 (Enhanced)
    const insertData = {
      order_id: orderId,
      user_id: userId,
      amount_krw: amount,
      goods_name: goodsName,
      payment_type: paymentType,
      pay_method: payMethod,
      currency: 'KRW',
      signature: signature,
      user_agent: requestMeta.user_agent,
      ip_address: requestMeta.ip_address,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    console.log('💾 [CreateOrder] 데이터베이스에 주문 정보 저장 시작');
    const { data: orderData, error: orderError } = await supabase
      .from('payment_orders')
      .insert(insertData)
      .select()
      .single();

    if (orderError) {
      console.error('❌ [CreateOrder] 주문 생성 실패:', orderError);
      await logPaymentEvent('order_creation_failed', { 
        error: orderError.message, 
        orderId, 
        userId, 
        ...requestMeta 
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to create order',
        message: 'Database error occurred while creating order'
      });
    }

    console.log('✅ [CreateOrder] 주문 생성 성공:', orderId);
    await logPaymentEvent('order_created', { 
      orderId, 
      userId, 
      amount, 
      paymentType, 
      payMethod, 
      ...requestMeta 
    }, userId, orderData.id);

    return res.status(200).json({
      success: true,
      orderId: orderId,
      amount: amount,
      goodsName: goodsName,
      paymentType: paymentType,
      payMethod: payMethod,
      signature: signature,
      clientId: NICEPAY_CONFIG.CLIENT_ID,
      returnUrl: `${req.headers.origin || 'http://localhost:5173'}/api/nicepay?action=callback`,
      timestamp: timestamp
    });

  } catch (error) {
    console.error('💥 [CreateOrder] 주문 생성 오류:', error);
    await logPaymentEvent('create_order_error', { 
      error: error.message, 
      ...requestMeta 
    });
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to create order'
    });
  }
}

// 결제 승인 (Enhanced with signature validation)
async function handleApprove(req, res, requestMeta) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    validateRequest(req, ['tid', 'amount', 'orderId', 'signature']);
    
    const { tid, amount, orderId, signature } = req.body;

    // 주문 정보 조회 및 검증
    const { data: orderData, error: orderError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (orderError || !orderData) {
      await logPaymentEvent('order_not_found', { orderId, tid, ...requestMeta });
      return res.status(404).json({ error: 'Order not found' });
    }

    // 시그니처 검증
    const signatureData = {
      orderId,
      amount: amount.toString(),
      tid
    };
    
    if (!verifySignature(signatureData, signature, NICEPAY_CONFIG.SECRET_KEY)) {
      await logPaymentEvent('signature_verification_failed', { orderId, tid, ...requestMeta }, orderData.user_id, orderData.id);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // 금액 검증
    if (parseInt(amount) !== orderData.amount_krw) {
      await logPaymentEvent('amount_mismatch', { 
        orderId, 
        tid, 
        requestAmount: amount, 
        orderAmount: orderData.amount_krw, 
        ...requestMeta 
      }, orderData.user_id, orderData.id);
      return res.status(400).json({ error: 'Amount mismatch' });
    }

    // 중복 처리 방지
    if (orderData.status !== 'pending') {
      await logPaymentEvent('duplicate_approval_attempt', { orderId, tid, currentStatus: orderData.status, ...requestMeta }, orderData.user_id, orderData.id);
      return res.status(400).json({ error: 'Order already processed' });
    }

    // Basic 인증 헤더 생성
    const authString = Buffer.from(`${NICEPAY_CONFIG.CLIENT_ID}:${NICEPAY_CONFIG.SECRET_KEY}`).toString('base64');

    // 결제 방법별 API 파라미터 설정
    const getPaymentMethodParams = (payMethod, baseParams) => {
      const params = { ...baseParams };
      
      switch (payMethod) {
        case 'kakaopay':
          params.payMethod = 'KAKAOPAY';
          break;
        case 'naverpay':
          params.payMethod = 'NAVERPAY';
          break;
        case 'bank':
          params.payMethod = 'BANK';
          break;
        case 'card':
        default:
          params.payMethod = 'CARD';
          break;
      }
      
      return params;
    };

    // 나이스페이 승인 API 호출
    const baseParams = {
      amount: amount,
      orderId: orderId
    };
    
    const paymentParams = getPaymentMethodParams(orderData.pay_method || 'card', baseParams);
    
    const approveResponse = await fetch(`${NICEPAY_CONFIG.API_URL}/${tid}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentParams)
    });

    const approveResult = await approveResponse.json();

    if (!approveResponse.ok || approveResult.resultCode !== '0000') {
      console.error('Payment approval failed:', approveResult);
      
      // 실패 상태 업데이트
      await supabase
        .from('payment_orders')
        .update({
          status: 'failed',
          nicepay_data: approveResult,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId);

      await logPaymentEvent('payment_approval_failed', { 
        orderId, 
        tid, 
        error: approveResult, 
        ...requestMeta 
      }, orderData.user_id, orderData.id);

      return res.status(400).json({
        success: false,
        error: 'Payment approval failed',
        details: approveResult
      });
    }

    // 결제 거래 기록 생성
    const { data: transactionData, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        payment_order_id: orderData.id,
        user_id: orderData.user_id,
        transaction_id: tid,
        transaction_type: 'payment',
        amount: parseInt(amount),
        currency: 'KRW',
        pay_method: approveResult.payMethod || 'CARD',
        card_company: approveResult.cardName,
        card_number: approveResult.cardNo,
        installment: approveResult.installment || 0,
        status: 'success',
        result_code: approveResult.resultCode,
        result_message: approveResult.resultMsg,
        auth_code: approveResult.authCode,
        auth_date: new Date().toISOString(),
        nicepay_response: approveResult,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
    }

    // 주문 상태 업데이트
    const { error: updateError } = await supabase
      .from('payment_orders')
      .update({
        status: 'approved',
        transaction_id: tid,
        approved_at: new Date().toISOString(),
        nicepay_data: approveResult,
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId);

    if (updateError) {
      console.error('Order update error:', updateError);
    }

    // 포인트 지급 처리
    const pointsGranted = await processPointGrant(orderData, approveResult, transactionData?.id);

    await logPaymentEvent('payment_approved', { 
      orderId, 
      tid, 
      amount, 
      pointsGranted,
      ...requestMeta 
    }, orderData.user_id, orderData.id);

    return res.status(200).json({
      success: true,
      transactionId: tid,
      orderId: orderId,
      pointsGranted: pointsGranted,
      approveResult: approveResult
    });

  } catch (error) {
    console.error('Approve payment error:', error);
    await logPaymentEvent('approve_error', { error: error.message, ...requestMeta });
    return res.status(500).json({ error: 'Failed to approve payment' });
  }
}

// 콜백 처리 (Enhanced)
async function handleCallback(req, res, requestMeta) {
  try {
    const { authResultCode, authResultMsg, tid, orderId, amount } = req.body || req.query;

    await logPaymentEvent('callback_received', { 
      authResultCode, 
      authResultMsg, 
      tid, 
      orderId, 
      amount, 
      ...requestMeta 
    });

    if (authResultCode === '0000') {
      // 결제 성공 - 클라이언트로 리다이렉트
      return res.redirect(`${req.headers.origin || 'http://localhost:5173'}/payment/success?orderId=${orderId}&tid=${tid}`);
    } else {
      // 결제 실패 - 클라이언트로 리다이렉트
      return res.redirect(`${req.headers.origin || 'http://localhost:5173'}/payment/failure?orderId=${orderId}&error=${encodeURIComponent(authResultMsg)}`);
    }

  } catch (error) {
    console.error('Callback handling error:', error);
    await logPaymentEvent('callback_error', { error: error.message, ...requestMeta });
    return res.redirect(`${req.headers.origin || 'http://localhost:5173'}/payment/failure?error=${encodeURIComponent('Callback processing failed')}`);
  }
}

// 웹훅 처리 (New)
async function handleWebhook(req, res, requestMeta) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing signature header' });
    }

    // 시그니처 검증
    if (!verifySignature(req.body, signature, NICEPAY_CONFIG.SECRET_KEY)) {
      await logPaymentEvent('webhook_signature_failed', { ...requestMeta });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { eventType, data } = req.body;

    await logPaymentEvent('webhook_received', { eventType, data, ...requestMeta });

    // 웹훅 이벤트 처리
    switch (eventType) {
      case 'payment.approved':
        await handlePaymentApprovedWebhook(data);
        break;
      case 'payment.cancelled':
        await handlePaymentCancelledWebhook(data);
        break;
      case 'refund.completed':
        await handleRefundCompletedWebhook(data);
        break;
      default:
        console.log('Unknown webhook event:', eventType);
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Webhook handling error:', error);
    await logPaymentEvent('webhook_error', { error: error.message, ...requestMeta });
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
}

// 설정 정보 제공
async function handleConfig(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    clientId: NICEPAY_CONFIG.CLIENT_ID,
    jsUrl: NICEPAY_CONFIG.JS_URL
  });
}

// 포인트 지급 처리 (Enhanced)
async function processPointGrant(orderData, paymentResult, transactionId = null) {
  try {
    const { user_id, amount_krw, payment_type, order_id } = orderData;

    // 결제 ID 생성 (NicePay 거래 ID 또는 주문 ID 사용)
    const payment_id = paymentResult?.tid || `${order_id}_${Date.now()}`;

    // charge_points 함수 호출 (올바른 파라미터 사용)
    const { data: chargeResult, error: chargeError } = await supabase
      .rpc('charge_points', {
        p_user_id: user_id,
        p_amount_krw: amount_krw,
        p_payment_type: payment_type,
        p_payment_id: payment_id
      });

    if (chargeError) {
      console.error('Point charge error:', chargeError);
      await logPaymentEvent('point_charge_error', { 
        error: chargeError.message, 
        user_id, 
        amount_krw, 
        payment_type 
      }, user_id, order_id);
      return 0;
    }

    const result = chargeResult[0];

    if (!result.success) {
      console.error('Point charge failed:', result.error_message);
      await logPaymentEvent('point_charge_failed', { 
        error: result.error_message, 
        user_id, 
        amount_krw, 
        payment_type 
      }, user_id, order_id);
      return 0;
    }

    const totalPointsGranted = result.total_points;

    // 거래 기록에 포인트 정보 업데이트
    if (transactionId) {
      await supabase
        .from('payment_transactions')
        .update({
          points_granted: totalPointsGranted,
          base_points: result.base_points,
          bonus_points: result.bonus_points,
          points_expires_at: result.expires_at
        })
        .eq('id', transactionId);
    }

    await logPaymentEvent('points_granted', { 
      total_points: totalPointsGranted,
      base_points: result.base_points,
      bonus_points: result.bonus_points,
      expires_at: result.expires_at,
      payment_id
    }, user_id, order_id);

    console.log(`Points granted successfully: ${totalPointsGranted} (${result.base_points} base + ${result.bonus_points} bonus) to user ${user_id}`);
    return totalPointsGranted;

  } catch (error) {
    console.error('Point grant processing error:', error);
    await logPaymentEvent('point_grant_error', { 
      error: error.message, 
      user_id: orderData?.user_id, 
      order_id: orderData?.order_id 
    }, orderData?.user_id, orderData?.order_id);
    return 0;
  }
}

// 웹훅 이벤트 핸들러들
async function handlePaymentApprovedWebhook(data) {
  try {
    const { orderId, tid, amount, payMethod, cardName, authCode } = data;

    // 주문 정보 조회
    const { data: orderData, error: orderError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (orderError || !orderData) {
      console.error('Order not found for webhook:', orderId);
      return;
    }

    // 주문 상태를 완료로 업데이트
    await supabase
      .from('payment_orders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        nicepay_data: data
      })
      .eq('order_id', orderId);

    // 거래 기록 업데이트
    await supabase
      .from('payment_transactions')
      .update({
        status: 'completed',
        pay_method: payMethod,
        card_company: cardName,
        auth_code: authCode,
        completed_at: new Date().toISOString(),
        nicepay_response: data
      })
      .eq('transaction_id', tid);

    await logPaymentEvent('webhook_payment_approved', data, orderData.user_id, orderData.id);
    console.log('Payment approved webhook processed:', orderId);

  } catch (error) {
    console.error('Payment approved webhook error:', error);
    await logPaymentEvent('webhook_payment_approved_error', { error: error.message, data });
  }
}

async function handlePaymentCancelledWebhook(data) {
  try {
    const { orderId, tid, cancelAmount, cancelReason } = data;

    // 주문 정보 조회
    const { data: orderData, error: orderError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (orderError || !orderData) {
      console.error('Order not found for cancellation webhook:', orderId);
      return;
    }

    // 주문 상태를 취소로 업데이트
    await supabase
      .from('payment_orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        nicepay_data: data
      })
      .eq('order_id', orderId);

    // 거래 기록 업데이트
    await supabase
      .from('payment_transactions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: cancelReason,
        nicepay_response: data
      })
      .eq('transaction_id', tid);

    // 포인트 차감 처리 (이미 지급된 포인트가 있다면)
    if (orderData.status === 'completed') {
      await handlePointsRevocation(orderData, cancelAmount);
    }

    await logPaymentEvent('webhook_payment_cancelled', data, orderData.user_id, orderData.id);
    console.log('Payment cancelled webhook processed:', orderId);

  } catch (error) {
    console.error('Payment cancelled webhook error:', error);
    await logPaymentEvent('webhook_payment_cancelled_error', { error: error.message, data });
  }
}

async function handleRefundCompletedWebhook(data) {
  try {
    const { orderId, tid, refundAmount, refundReason } = data;

    // 환불 기록 생성
    const { data: refundData, error: refundError } = await supabase
      .from('refunds')
      .insert({
        payment_order_id: data.paymentOrderId,
        transaction_id: tid,
        refund_amount: refundAmount,
        refund_reason: refundReason,
        status: 'completed',
        processed_at: new Date().toISOString(),
        pg_response: data
      })
      .select()
      .single();

    if (refundError) {
      console.error('Refund record creation error:', refundError);
      return;
    }

    // 주문 상태 업데이트
    await supabase
      .from('payment_orders')
      .update({
        status: 'refunded',
        nicepay_data: data
      })
      .eq('order_id', orderId);

    // 거래 기록 업데이트
    await supabase
      .from('payment_transactions')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        nicepay_response: data
      })
      .eq('transaction_id', tid);

    await logPaymentEvent('webhook_refund_completed', data);
    console.log('Refund completed webhook processed:', orderId);

  } catch (error) {
    console.error('Refund completed webhook error:', error);
    await logPaymentEvent('webhook_refund_completed_error', { error: error.message, data });
  }
}

// 포인트 회수 처리
async function handlePointsRevocation(orderData, cancelAmount) {
  try {
    // 해당 주문으로 지급된 포인트 조회
    const { data: pointTransactions, error: pointError } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('source_type', 'payment')
      .eq('source_id', orderData.id)
      .eq('transaction_type', 'charge');

    if (pointError || !pointTransactions?.length) {
      console.log('No points to revoke for order:', orderData.order_id);
      return;
    }

    // 포인트 차감 기록 생성
    for (const pointTx of pointTransactions) {
      await supabase
        .from('point_transactions')
        .insert({
          user_id: orderData.user_id,
          amount: -pointTx.amount,
          transaction_type: 'deduct',
          source_type: 'payment_cancel',
          source_id: orderData.id,
          description: `결제 취소로 인한 포인트 차감 (주문: ${orderData.order_id})`,
          created_at: new Date().toISOString()
        });
    }

    // 사용자 총 포인트 업데이트
    const totalRevoked = pointTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    await supabase
      .from('users')
      .update({
        total_points: supabase.raw(`total_points - ${totalRevoked}`)
      })
      .eq('id', orderData.user_id);

    console.log(`Points revoked: ${totalRevoked} from user ${orderData.user_id}`);

  } catch (error) {
    console.error('Points revocation error:', error);
  }
}