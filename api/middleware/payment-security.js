import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
const NICEPAY_SECRET_KEY = process.env.NICEPAY_SECRET_KEY || '101d2ae924fa4ae398c3b76a7ba62226';

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map();

// Security configuration
const SECURITY_CONFIG = {
  // Rate limiting
  RATE_LIMIT: {
    PAYMENT_CREATE: { requests: 5, window: 60000 }, // 5 requests per minute
    PAYMENT_VERIFY: { requests: 10, window: 60000 }, // 10 requests per minute
    WEBHOOK: { requests: 100, window: 60000 }, // 100 requests per minute
    DEFAULT: { requests: 20, window: 60000 } // 20 requests per minute
  },
  
  // Request validation
  MAX_REQUEST_SIZE: 1024 * 1024, // 1MB
  ALLOWED_ORIGINS: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://patent-ai.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  
  // Security headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  }
};

/**
 * Rate limiting middleware
 */
export function rateLimit(type = 'DEFAULT') {
  return (req, res, next) => {
    const config = SECURITY_CONFIG.RATE_LIMIT[type] || SECURITY_CONFIG.RATE_LIMIT.DEFAULT;
    const key = `${req.ip || req.connection.remoteAddress}_${type}`;
    const now = Date.now();
    
    // Clean old entries
    for (const [storeKey, data] of rateLimitStore.entries()) {
      if (now - data.resetTime > config.window) {
        rateLimitStore.delete(storeKey);
      }
    }
    
    // Get current rate limit data
    let rateLimitData = rateLimitStore.get(key);
    if (!rateLimitData || now - rateLimitData.resetTime > config.window) {
      rateLimitData = {
        count: 0,
        resetTime: now
      };
    }
    
    // Check rate limit
    if (rateLimitData.count >= config.requests) {
      console.warn(`🚫 [Security] Rate limit exceeded for ${key}: ${rateLimitData.count}/${config.requests}`);
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((config.window - (now - rateLimitData.resetTime)) / 1000)
      });
    }
    
    // Update rate limit data
    rateLimitData.count++;
    rateLimitStore.set(key, rateLimitData);
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', config.requests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.requests - rateLimitData.count));
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitData.resetTime + config.window).toISOString());
    
    next();
  };
}

/**
 * CORS middleware with security
 */
export function secureCors(req, res, next) {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  if (origin && SECURITY_CONFIG.ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Allow same-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Add security headers
  Object.entries(SECURITY_CONFIG.SECURITY_HEADERS).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}

/**
 * Request validation middleware
 */
export function validateRequest(req, res, next) {
  // Check request size
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > SECURITY_CONFIG.MAX_REQUEST_SIZE) {
    console.warn(`🚫 [Security] Request too large: ${contentLength} bytes`);
    return res.status(413).json({
      success: false,
      error: 'Request entity too large',
      errorCode: 'REQUEST_TOO_LARGE'
    });
  }
  
  // Validate Content-Type for POST/PUT requests
  if (['POST', 'PUT'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Content-Type. Expected application/json',
        errorCode: 'INVALID_CONTENT_TYPE'
      });
    }
  }
  
  // Add request ID for tracking
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  
  console.log(`🔍 [Security] Request validated: ${req.method} ${req.url} [${req.requestId}]`);
  next();
}

/**
 * Authentication middleware for payment endpoints
 */
export async function authenticatePayment(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`🚫 [Security] No auth token provided for ${req.url}`);
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      errorCode: 'NO_AUTH_TOKEN'
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    // First try to verify with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      // If Supabase verification fails, try JWT verification as fallback
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        console.log(`✅ [Security] User authenticated via JWT: ${decoded.email} [${req.requestId}]`);
        return next();
      } catch (jwtError) {
        console.warn(`🚫 [Security] Invalid token (both Supabase and JWT failed): ${error?.message || jwtError.message} [${req.requestId}]`);
        return res.status(401).json({
          success: false,
          error: 'Invalid authentication token',
          errorCode: 'INVALID_TOKEN'
        });
      }
    }
    
    // Supabase authentication successful
    req.user = {
      id: user.id,
      email: user.email,
      ...user.user_metadata
    };
    
    console.log(`✅ [Security] User authenticated via Supabase: ${user.email} [${req.requestId}]`);
    next();
  } catch (error) {
    console.warn(`🚫 [Security] Authentication error: ${error.message} [${req.requestId}]`);
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token',
      errorCode: 'INVALID_TOKEN'
    });
  }
}

/**
 * Admin authentication middleware
 */
export function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Admin authentication required',
      errorCode: 'NO_ADMIN_TOKEN'
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      console.warn(`🚫 [Security] Non-admin access attempt: ${decoded.email} [${req.requestId}]`);
      return res.status(403).json({
        success: false,
        error: 'Admin privileges required',
        errorCode: 'INSUFFICIENT_PRIVILEGES'
      });
    }
    
    req.admin = decoded;
    console.log(`✅ [Security] Admin authenticated: ${decoded.email} [${req.requestId}]`);
    next();
  } catch (error) {
    console.warn(`🚫 [Security] Invalid admin token: ${error.message} [${req.requestId}]`);
    return res.status(401).json({
      success: false,
      error: 'Invalid admin authentication token',
      errorCode: 'INVALID_ADMIN_TOKEN'
    });
  }
}

/**
 * NicePay webhook signature validation
 */
export function validateNicePaySignature(req, res, next) {
  const signature = req.headers['x-nicepay-signature'];
  const timestamp = req.headers['x-nicepay-timestamp'];
  
  if (!signature || !timestamp) {
    console.warn(`🚫 [Security] Missing NicePay signature headers [${req.requestId}]`);
    return res.status(400).json({
      success: false,
      error: 'Missing signature headers',
      errorCode: 'MISSING_SIGNATURE'
    });
  }
  
  // Check timestamp (prevent replay attacks)
  const now = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp);
  
  if (Math.abs(now - requestTime) > 300) { // 5 minutes tolerance
    console.warn(`🚫 [Security] Request timestamp too old: ${now - requestTime}s [${req.requestId}]`);
    return res.status(400).json({
      success: false,
      error: 'Request timestamp invalid',
      errorCode: 'INVALID_TIMESTAMP'
    });
  }
  
  // Validate signature
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', NICEPAY_SECRET_KEY)
    .update(timestamp + payload)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    console.warn(`🚫 [Security] Invalid NicePay signature [${req.requestId}]`);
    return res.status(400).json({
      success: false,
      error: 'Invalid signature',
      errorCode: 'INVALID_SIGNATURE'
    });
  }
  
  console.log(`✅ [Security] NicePay signature validated [${req.requestId}]`);
  next();
}

/**
 * Input sanitization middleware
 */
export function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  next();
}

function sanitizeObject(obj) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Error handling middleware
 */
export function handleSecurityError(error, req, res, next) {
  console.error(`🚨 [Security] Error in ${req?.url || 'unknown'}:`, {
    error: error.message,
    stack: error.stack,
    requestId: req?.requestId,
    ip: req?.ip || req?.connection?.remoteAddress,
    userAgent: req?.headers?.['user-agent']
  });
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    errorCode: 'INTERNAL_ERROR',
    ...(isDevelopment && { details: error.message, requestId: req.requestId })
  });
}

/**
 * Logging middleware for security events
 */
export function logSecurityEvent(req, res, next) {
  const startTime = Date.now();
  
  // Log request
  console.log(`📝 [Security] ${req.method} ${req.url}`, {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    console.log(`📝 [Security] Response ${res.statusCode} for ${req.method} ${req.url}`, {
      duration: `${duration}ms`,
      requestId: req.requestId,
      statusCode: res.statusCode
    });
    
    originalEnd.apply(this, args);
  };
  
  next();
}

/**
 * Combined payment security middleware
 */
export function paymentSecurity(options = {}) {
  const {
    requireAuth = true,
    requireAdmin = false,
    rateLimitType = 'DEFAULT',
    validateSignature = false
  } = options;
  
  return [
    logSecurityEvent,
    secureCors,
    validateRequest,
    rateLimit(rateLimitType),
    sanitizeInput,
    ...(requireAdmin ? [authenticateAdmin] : requireAuth ? [authenticatePayment] : []),
    ...(validateSignature ? [validateNicePaySignature] : [])
  ];
}

export default {
  rateLimit,
  secureCors,
  validateRequest,
  authenticatePayment,
  authenticateAdmin,
  validateNicePaySignature,
  sanitizeInput,
  handleSecurityError,
  logSecurityEvent,
  paymentSecurity
};