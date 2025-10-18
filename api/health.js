// health.js - 시스템 헬스체크 API 엔드포인트
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// 시스템 상태 체크 함수
async function checkSystemHealth() {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {},
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };

  // Supabase 연결 상태 체크
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      healthStatus.services.supabase = {
        status: error ? 'unhealthy' : 'healthy',
        message: error ? error.message : 'Connected successfully',
        responseTime: Date.now()
      };
    } else {
      healthStatus.services.supabase = {
        status: 'unhealthy',
        message: 'Supabase configuration missing',
        responseTime: null
      };
    }
  } catch (error) {
    healthStatus.services.supabase = {
      status: 'unhealthy',
      message: error.message,
      responseTime: null
    };
  }

  // KIPRIS API 상태 체크 (환경변수 확인)
  const kiprisApiKey = process.env.KIPRIS_SERVICE_KEY || process.env.KIPRIS_API_KEY;
  healthStatus.services.kipris = {
    status: kiprisApiKey ? 'configured' : 'not_configured',
    message: kiprisApiKey ? 'API key configured' : 'API key missing',
    configured: !!kiprisApiKey
  };

  // NicePay 상태 체크 (환경변수 확인)
  const nicepayMerchantId = process.env.NICEPAY_MERCHANT_ID;
  const nicepayMerchantKey = process.env.NICEPAY_MERCHANT_KEY;
  healthStatus.services.nicepay = {
    status: (nicepayMerchantId && nicepayMerchantKey) ? 'configured' : 'not_configured',
    message: (nicepayMerchantId && nicepayMerchantKey) ? 'Payment system configured' : 'Payment configuration missing',
    configured: !!(nicepayMerchantId && nicepayMerchantKey)
  };

  // OpenAI API 상태 체크 (환경변수 확인)
  const openaiApiKey = process.env.OPENAI_API_KEY;
  healthStatus.services.openai = {
    status: openaiApiKey ? 'configured' : 'not_configured',
    message: openaiApiKey ? 'OpenAI API configured' : 'OpenAI API key missing',
    configured: !!openaiApiKey
  };

  // Google API 상태 체크 (환경변수 확인)
  const googleApiKey = process.env.GOOGLE_API_KEY;
  healthStatus.services.google = {
    status: googleApiKey ? 'configured' : 'not_configured',
    message: googleApiKey ? 'Google API configured' : 'Google API key missing',
    configured: !!googleApiKey
  };

  // JWT 설정 체크
  const jwtSecret = process.env.JWT_SECRET;
  healthStatus.services.jwt = {
    status: jwtSecret ? 'configured' : 'not_configured',
    message: jwtSecret ? 'JWT secret configured' : 'JWT secret missing',
    configured: !!jwtSecret
  };

  // 전체 시스템 상태 결정
  const unhealthyServices = Object.values(healthStatus.services).filter(
    service => service.status === 'unhealthy'
  );
  
  if (unhealthyServices.length > 0) {
    healthStatus.status = 'degraded';
  }

  const notConfiguredServices = Object.values(healthStatus.services).filter(
    service => service.status === 'not_configured'
  );

  if (notConfiguredServices.length > 2) {
    healthStatus.status = 'degraded';
  }

  return healthStatus;
}

// 간단한 ping 응답
function getPingResponse() {
  return {
    status: 'ok',
    message: 'pong',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
}

// 메인 핸들러 함수
export default async function handler(req, res) {
  // CORS 헤더 설정
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.query;

    switch (action) {
      case 'ping':
        // 간단한 ping 체크
        const pingResponse = getPingResponse();
        return res.status(200).json(pingResponse);

      case 'detailed':
      case 'full':
        // 상세한 헬스체크
        const detailedHealth = await checkSystemHealth();
        const detailedStatusCode = detailedHealth.status === 'healthy' ? 200 : 
                          detailedHealth.status === 'degraded' ? 206 : 503;
        return res.status(detailedStatusCode).json(detailedHealth);

      default:
        // 기본 헬스체크
        const basicHealth = await checkSystemHealth();
        
        // 기본 응답에서는 간소화된 정보만 제공
        const basicResponse = {
          status: basicHealth.status,
          timestamp: basicHealth.timestamp,
          uptime: basicHealth.uptime,
          environment: basicHealth.environment,
          services_count: Object.keys(basicHealth.services).length,
          healthy_services: Object.values(basicHealth.services).filter(s => s.status === 'healthy' || s.status === 'configured').length
        };

        const basicStatusCode = basicHealth.status === 'healthy' ? 200 : 
                          basicHealth.status === 'degraded' ? 206 : 503;
        return res.status(basicStatusCode).json(basicResponse);
    }

  } catch (error) {
    console.error('❌ Health check error:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}