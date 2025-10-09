const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  try {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

  // 환경변수 확인 및 로깅 - Vercel 환경 고려
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  console.log('🔍 [Dashboard API] 환경변수 확인 (Vercel 호환):', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
    hasAnonKey: !!supabaseAnonKey,
    urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'undefined',
    nodeEnv: process.env.NODE_ENV,
    platform: process.env.VERCEL ? 'Vercel' : 'Local',
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
  });
  // 필수 항목은 URL과 Service Role Key. Anon Key가 없어도 서비스 키로 인증 절차를 대체할 수 있도록 처리
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase URL or Service Role Key:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasAnonKey: !!supabaseAnonKey,
      availableEnvKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
    });
    return res.status(500).json({ 
      success: false, 
      error: 'Server configuration error',
      details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    });
  }

  let supabase, supabaseAuth;
  
  try {
    // Service role client for admin operations
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Auth client: 기본은 Anon key, 없으면 Service Role 키로 대체
    if (supabaseAnonKey) {
      supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      console.log('✅ [Dashboard API] Supabase auth client created with ANON key');
    } else {
      supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      console.warn('⚠️ [Dashboard API] SUPABASE_ANON_KEY 누락: Service Role Key로 인증 클라이언트 대체');
    }
    
    console.log('✅ [Dashboard API] Supabase clients created successfully');
  } catch (clientError) {
    console.error('❌ [Dashboard API] Supabase client 생성 실패:', {
      error: clientError.message,
      stack: clientError.stack
    });
    return res.status(500).json({ 
      success: false, 
      error: 'Database connection error',
      details: clientError.message
    });
  }
    
    let user;
    
    // 요청 헤더 로깅 - 더 상세한 정보 포함
    console.log('📋 [Dashboard API] 요청 헤더 상세:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      authLength: req.headers.authorization ? req.headers.authorization.length : 0,
      authPrefix: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'none',
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin,
      referer: req.headers.referer,
      allHeaders: Object.keys(req.headers)
    });
    
    // 헤더 값 상세 로깅
    const authHeader = req.headers.authorization || req.headers.Authorization;
    console.log('🔍 [Dashboard API] Authorization 헤더 상세:', {
      hasAuthLower: !!req.headers.authorization,
      hasAuthUpper: !!req.headers.Authorization,
      authHeaderValue: authHeader,
      authHeaderType: typeof authHeader,
      authHeaderLength: authHeader ? authHeader.length : 0
    });
    
    // Authorization 헤더 확인 - 다양한 형식 지원
    if (!authHeader) {
      console.error('❌ [Dashboard API] Missing authorization header - 모든 헤더:', req.headers);
      return res.status(401).json({ 
        success: false, 
        error: 'Missing authorization header',
        details: 'Authorization header is required',
        debug: {
          hasAuth: !!req.headers.authorization,
          hasAuthCap: !!req.headers.Authorization,
          headerKeys: Object.keys(req.headers)
        }
      });
    }

    // Bearer 토큰 추출 - 더 유연한 처리
    let token;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (authHeader.startsWith('bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Bearer 없이 직접 토큰이 전달된 경우
      token = authHeader;
    }
    
    if (!token || token.length < 10) {
      console.error('❌ [Dashboard API] Invalid token format:', { 
        hasToken: !!token, 
        tokenLength: token ? token.length : 0,
        tokenPrefix: token ? token.substring(0, 10) + '...' : 'none',
        originalHeader: authHeader.substring(0, 30) + '...'
      });
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token format',
        details: 'Token must be at least 10 characters',
        debug: {
          tokenLength: token ? token.length : 0,
          headerFormat: authHeader.substring(0, 20) + '...'
        }
      });
    }
    
    // Check if test mode is enabled (development only)
    const testUserId = req.query.test_user_id;
    if (testUserId && process.env.NODE_ENV !== 'production') {
      console.log('🧪 Test mode: Using test user ID:', testUserId);
      user = { id: testUserId };
    } else if (req.query.user_id && process.env.NODE_ENV === 'production') {
      // Fallback: In production, if we have user_id in query and no auth header, 
      // this might be a direct API call - we should still require auth
      console.log('⚠️ [Dashboard API] Production mode with user_id but checking auth...');
    } else if (req.query.debug_users) {
      // Debug mode - show available users
      try {
        const { data: users, error } = await supabase
          .from('users')
          .select('id, email, name, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        
        return res.json({
          success: true,
          debug: true,
          users: users,
          message: 'Available users for testing'
        });
      } catch (error) {
        console.error('Debug users error:', error);
        return res.status(500).json({ success: false, error: 'Debug failed' });
      }
    } else {
      // Get user from Authorization header (check both cases)
      const authHeader = req.headers.authorization || req.headers.Authorization;
      
      if (!authHeader) {
        console.warn('❌ [Dashboard API] Authorization header 완전히 누락:', {
          allHeaderKeys: Object.keys(req.headers),
          hasAuthLower: !!req.headers.authorization,
          hasAuthUpper: !!req.headers.Authorization
        });
        return res.status(401).json({ success: false, error: 'Missing authorization header' });
      }

      if (!authHeader.startsWith('Bearer ') && !authHeader.startsWith('bearer ')) {
        console.warn('❌ [Dashboard API] Authorization header 형식 오류:', {
          headerValue: authHeader,
          headerStart: authHeader.substring(0, 10),
          expectedFormat: 'Bearer <token>'
        });
        return res.status(401).json({ success: false, error: 'Invalid authorization header format' });
      }

      const token = authHeader.split(' ')[1];
      
      if (!token || token.length < 10) {
        console.warn('❌ [Dashboard API] 유효하지 않은 토큰:', {
          hasToken: !!token,
          tokenLength: token ? token.length : 0,
          tokenValue: token ? token.substring(0, 10) + '...' : 'undefined'
        });
        return res.status(401).json({ success: false, error: 'Invalid token format' });
      }
      
      console.log('🔍 [Dashboard API] 토큰 검증 시작:', {
        tokenPrefix: token.substring(0, 20) + '...',
        tokenLength: token.length,
        tokenType: typeof token
      });
      
      try {
        console.log('🔐 [Dashboard API] Verifying token with Supabase...', {
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 20) + '...'
        });
        
        const { data: userData, error: authError } = await supabaseAuth.auth.getUser(token);
        
        if (authError) {
          console.error('❌ [Dashboard API] Supabase auth error:', {
            error: authError.message,
            code: authError.status,
            name: authError.name,
            tokenPrefix: token.substring(0, 10) + '...',
            supabaseUrl: supabaseUrl.substring(0, 30) + '...'
          });
          return res.status(401).json({ 
            success: false, 
            error: 'Authentication failed',
            details: authError.message,
            debug: {
              errorCode: authError.status,
              errorName: authError.name
            }
          });
        }
        
        if (!userData || !userData.user) {
          console.error('❌ [Dashboard API] No user data returned from Supabase:', {
            hasUserData: !!userData,
            userDataKeys: userData ? Object.keys(userData) : [],
            tokenValid: !!token
          });
          return res.status(401).json({ 
            success: false, 
            error: 'Invalid token',
            details: 'No user found for provided token',
            debug: {
              hasUserData: !!userData,
              userDataStructure: userData ? Object.keys(userData) : []
            }
          });
        }
        
        user = userData.user;
        console.log('✅ [Dashboard API] User authenticated successfully:', { 
          userId: user.id, 
          email: user.email,
          hasId: !!user.id,
          userKeys: Object.keys(user)
        });
        
      } catch (authError) {
        console.error('❌ [Dashboard API] Authentication exception:', {
          error: authError.message,
          name: authError.name,
          stack: authError.stack,
          tokenPrefix: token.substring(0, 10) + '...'
        });
        return res.status(500).json({ 
          success: false, 
          error: 'Authentication system error',
          details: authError.message,
          debug: {
            errorType: authError.name,
            hasToken: !!token
          }
        });
      }
    }

    // Get query parameters with validation
    const { user_id, period = '100d' } = req.query;
    
    console.log('📊 [Dashboard API] Query parameters:', {
      requestedUserId: user_id,
      authenticatedUserId: user.id,
      period: period,
      userMatch: user_id === user.id,
      hasUserId: !!user.id,
      userIdType: typeof user.id
    });

    // Validate user object and ID
    if (!user || !user.id) {
      console.error('❌ [Dashboard API] User object invalid:', {
        hasUser: !!user,
        userKeys: user ? Object.keys(user) : [],
        userId: user ? user.id : 'undefined'
      });
      return res.status(500).json({ 
        success: false, 
        error: 'User authentication data invalid',
        details: 'User ID not found in authentication data'
      });
    }

    // Use authenticated user's ID for security
    const targetUserId = user.id;

    console.log('🔍 [Dashboard API] Calling get_dashboard_stats function...', {
      targetUserId: targetUserId,
      period: period,
      supabaseConnected: !!supabase
    });
    
    const { data, error } = await supabase.rpc('get_dashboard_stats', {
      p_user_id: targetUserId,
      p_period: period
    });

    if (error) {
      console.error('❌ [Dashboard API] Database error:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId: targetUserId,
        period: period,
        errorName: error.name
      });
      return res.status(500).json({ 
        success: false, 
        error: 'Database query failed',
        details: error.message,
        debug: {
          errorCode: error.code,
          userId: targetUserId,
          period: period
        }
      });
    }

    console.log('✅ [Dashboard API] Database query successful:', {
      hasData: !!data,
      dataType: typeof data,
      dataLength: Array.isArray(data) ? data.length : 'not array',
      dataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
      userId: targetUserId
    });

    return res.status(200).json({
      success: true,
      data: data || {},
      user_id: targetUserId,
      period: period,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Dashboard API] Unexpected error:', {
      error: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      requestUrl: req.url,
      requestMethod: req.method
    });
    
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message,
      debug: {
        errorType: error.name,
        timestamp: new Date().toISOString()
      }
    });
  }
};